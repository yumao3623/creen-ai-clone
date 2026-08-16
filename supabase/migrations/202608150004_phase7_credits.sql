-- Phase 7 Credits: production pricing, quote snapshots, deterministic lot
-- allocation, atomic reservation, and idempotent settlement/compensation.
begin;

alter table public.quotes
  add column if not exists modality public.generation_modality,
  add column if not exists model_key text,
  add column if not exists parameter_key text;

update public.quotes quote
set modality = task.modality,
    model_key = task.model_key,
    parameter_key = coalesce(quote.parameter_key, 'legacy')
from public.generation_tasks task
where task.quote_id = quote.id
  and (quote.modality is null or quote.model_key is null or quote.parameter_key is null);

alter table public.quotes
  drop constraint if exists quotes_model_key_format,
  add constraint quotes_model_key_format
    check (model_key is null or model_key ~ '^[a-z0-9][a-z0-9_.-]{1,127}$'),
  drop constraint if exists quotes_parameter_key_format,
  add constraint quotes_parameter_key_format
    check (parameter_key is null or parameter_key ~ '^[a-z0-9][a-z0-9_.-]{1,127}$');

create table if not exists public.credit_reservation_allocations (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.profiles(id) on delete cascade,
  reservation_id uuid not null references public.credit_reservations(id) on delete restrict,
  credit_lot_id uuid not null references public.credit_lots(id) on delete restrict,
  allocated_credits bigint not null check (allocated_credits > 0),
  created_at timestamptz not null default timezone('utc', now()),
  unique (reservation_id, credit_lot_id)
);

create index if not exists credit_reservation_allocations_owner_idx
  on public.credit_reservation_allocations (owner_user_id, created_at desc);

drop trigger if exists quotes_append_only on public.quotes;
create trigger quotes_append_only before update or delete on public.quotes
  for each row execute procedure public.reject_mutation();

drop trigger if exists credit_reservation_allocations_append_only
  on public.credit_reservation_allocations;
create trigger credit_reservation_allocations_append_only
  before update or delete on public.credit_reservation_allocations
  for each row execute procedure public.reject_mutation();

alter table public.credit_reservation_allocations enable row level security;

drop policy if exists credit_reservation_allocations_select_own
  on public.credit_reservation_allocations;
create policy credit_reservation_allocations_select_own
  on public.credit_reservation_allocations for select to authenticated
  using ((select auth.uid()) = owner_user_id);

-- One credit represents USD 0.0001 of the validated provider-cost basis.
-- Video 10s is conservatively derived as 2x the validated 5s cost. Speech is
-- priced in 10-character units from the validated USD 0.00006/character run.
insert into public.price_versions (version_key, effective_from)
values ('production.credits.v1', '2026-08-15 00:00:00+00')
on conflict (version_key) do nothing;

insert into public.model_prices (
  price_version_id,
  modality,
  model_key,
  parameter_key,
  credits_cost,
  provider_currency,
  provider_cost_microunits
)
select version.id, price.modality, price.model_key, price.parameter_key,
       price.credits_cost, 'USD', price.provider_cost_microunits
from public.price_versions version
cross join (values
  ('text_to_image'::public.generation_modality, 'fal.flux.schnell', 'default', 30::bigint, 3000::bigint),
  ('image_to_video'::public.generation_modality, 'fal.kling.v2_1.standard.image_to_video', 'duration_5', 2800::bigint, 280000::bigint),
  ('image_to_video'::public.generation_modality, 'fal.kling.v2_1.standard.image_to_video', 'duration_10', 5600::bigint, 560000::bigint),
  ('text_to_speech'::public.generation_modality, 'fal.minimax.speech_02_hd', 'characters_10', 6::bigint, 600::bigint)
) as price(modality, model_key, parameter_key, credits_cost, provider_cost_microunits)
where version.version_key = 'production.credits.v1'
on conflict (price_version_id, modality, model_key, parameter_key) do nothing;

create or replace function public.generation_parameter_key(
  p_modality public.generation_modality,
  p_normalized_input jsonb
)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  v_duration text;
begin
  if jsonb_typeof(p_normalized_input) <> 'object'
    or p_normalized_input ->> 'modality' is distinct from p_modality::text then
    raise exception 'generation input does not match modality' using errcode = '22023';
  end if;

  case p_modality
    when 'text_to_image' then
      return 'default';
    when 'image_to_video' then
      v_duration := coalesce(p_normalized_input ->> 'duration', '5');
      if v_duration not in ('5', '10') then
        raise exception 'unsupported video duration' using errcode = '22023';
      end if;
      return 'duration_' || v_duration;
    when 'text_to_speech' then
      if coalesce(char_length(p_normalized_input ->> 'text'), 0) = 0 then
        raise exception 'speech text is required' using errcode = '22023';
      end if;
      return 'characters_10';
  end case;
end;
$$;

create or replace function public.create_generation_quote(
  p_modality public.generation_modality,
  p_model_key text,
  p_normalized_input jsonb
)
returns table (
  quote_id uuid,
  price_version_id uuid,
  credits_cost bigint,
  parameter_key text,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth, extensions, pg_temp
as $$
declare
  v_actor_id uuid := auth.uid();
  v_parameter_key text;
  v_parameters_hash char(64);
  v_price public.model_prices%rowtype;
  v_units bigint := 1;
  v_quote public.quotes%rowtype;
begin
  if v_actor_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  v_parameter_key := public.generation_parameter_key(p_modality, p_normalized_input);
  v_parameters_hash := encode(
    digest(convert_to(p_normalized_input::text, 'UTF8'), 'sha256'),
    'hex'
  );

  select price.* into v_price
  from public.model_prices price
  join public.price_versions version on version.id = price.price_version_id
  where version.version_key like 'production.credits.%'
    and version.effective_from <= timezone('utc', now())
    and (version.effective_to is null or version.effective_to > timezone('utc', now()))
    and price.modality = p_modality
    and price.model_key = p_model_key
    and price.parameter_key = v_parameter_key
  order by version.effective_from desc, version.created_at desc
  limit 1;

  if v_price.id is null then
    raise exception 'no active production price for generation request'
      using errcode = '22023';
  end if;

  if p_modality = 'text_to_speech' then
    v_units := greatest(
      1,
      (char_length(p_normalized_input ->> 'text') + 9) / 10
    );
  end if;

  select * into v_quote
  from public.quotes quote
  where quote.owner_user_id = v_actor_id
    and quote.price_version_id = v_price.price_version_id
    and quote.modality = p_modality
    and quote.model_key = p_model_key
    and quote.parameter_key = v_parameter_key
    and quote.parameters_hash = v_parameters_hash
    and quote.credits_cost = v_price.credits_cost * v_units
    and quote.expires_at > timezone('utc', now()) + interval '30 seconds'
  order by quote.created_at desc
  limit 1;

  if v_quote.id is null then
    insert into public.quotes (
      owner_user_id,
      price_version_id,
      modality,
      model_key,
      parameter_key,
      parameters_hash,
      credits_cost,
      expires_at
    ) values (
      v_actor_id,
      v_price.price_version_id,
      p_modality,
      p_model_key,
      v_parameter_key,
      v_parameters_hash,
      v_price.credits_cost * v_units,
      timezone('utc', now()) + interval '15 minutes'
    ) returning * into v_quote;
  end if;

  return query select v_quote.id, v_quote.price_version_id,
    v_quote.credits_cost, v_quote.parameter_key, v_quote.expires_at;
end;
$$;

-- PostgreSQL cannot change a function's OUT row type through
-- CREATE OR REPLACE. Phase 5 created this exact input signature with a
-- smaller result row, so replace it explicitly inside this transaction.
drop function if exists public.submit_generation_task(
  uuid,
  char,
  public.generation_modality,
  text,
  jsonb,
  uuid
);

create or replace function public.submit_generation_task(
  p_client_key uuid,
  p_request_hash char(64),
  p_modality public.generation_modality,
  p_model_key text,
  p_normalized_input jsonb,
  p_quote_id uuid
)
returns table (
  task_id uuid,
  reservation_id uuid,
  credits_reserved bigint,
  was_replayed boolean
)
language plpgsql
security definer
set search_path = public, auth, extensions, pg_temp
as $$
declare
  v_actor_id uuid := auth.uid();
  v_existing public.idempotency_records%rowtype;
  v_quote public.quotes%rowtype;
  v_account public.credit_accounts%rowtype;
  v_task_id uuid;
  v_reservation_id uuid;
  v_parameters_hash char(64);
  v_remaining bigint;
  v_lot public.credit_lots%rowtype;
  v_take bigint;
begin
  if v_actor_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(v_actor_id::text || ':' || p_client_key::text, 0)
  );

  select * into v_existing
  from public.idempotency_records
  where actor_user_id = v_actor_id
    and operation = 'generation.submit'
    and client_key = p_client_key
  for update;

  if found then
    if v_existing.request_hash <> p_request_hash then
      raise exception 'idempotency key was reused with a different request'
        using errcode = '22023';
    end if;

    select reservation.id into v_reservation_id
    from public.credit_reservations reservation
    where reservation.generation_task_id =
      (v_existing.result_reference ->> 'generation_task_id')::uuid;

    return query
      select (v_existing.result_reference ->> 'generation_task_id')::uuid,
        v_reservation_id,
        coalesce((v_existing.result_reference ->> 'credits_reserved')::bigint, 0),
        true;
    return;
  end if;

  v_parameters_hash := encode(
    digest(convert_to(p_normalized_input::text, 'UTF8'), 'sha256'),
    'hex'
  );

  select * into v_quote
  from public.quotes quote
  where quote.id = p_quote_id
    and quote.owner_user_id = v_actor_id
  for share;

  if v_quote.id is null
    or v_quote.expires_at <= timezone('utc', now())
    or v_quote.modality is distinct from p_modality
    or v_quote.model_key is distinct from p_model_key
    or v_quote.parameter_key is distinct from
      public.generation_parameter_key(p_modality, p_normalized_input)
    or v_quote.parameters_hash <> v_parameters_hash then
    raise exception 'quote is unavailable or does not match the request'
      using errcode = '22023';
  end if;

  select * into v_account
  from public.credit_accounts
  where owner_user_id = v_actor_id
  for update;

  if v_account.owner_user_id is null then
    raise exception 'credit account is unavailable' using errcode = '55000';
  end if;

  if v_account.available_credits < v_quote.credits_cost then
    raise exception 'insufficient credits' using errcode = 'P0001';
  end if;

  insert into public.generation_tasks (
    owner_user_id, modality, model_key, normalized_input, quote_id, status
  ) values (
    v_actor_id, p_modality, p_model_key, p_normalized_input, p_quote_id, 'quoted'
  ) returning id into v_task_id;

  update public.generation_tasks
  set status = 'reserving'
  where id = v_task_id;

  insert into public.credit_reservations (
    owner_user_id, generation_task_id, quote_id, reserved_credits, status
  ) values (
    v_actor_id, v_task_id, p_quote_id, v_quote.credits_cost, 'reserved'
  ) returning id into v_reservation_id;

  v_remaining := v_quote.credits_cost;
  for v_lot in
    select *
    from public.credit_lots lot
    where lot.owner_user_id = v_actor_id
      and lot.remaining_credits > 0
      and (lot.expires_at is null or lot.expires_at > timezone('utc', now()))
    order by
      case lot.source
        when 'subscription' then 0
        when 'recurring_credit_pack' then 1
        else 2
      end,
      lot.expires_at asc nulls last,
      lot.created_at asc,
      lot.id asc
    for update
  loop
    exit when v_remaining = 0;
    v_take := least(v_remaining, v_lot.remaining_credits);

    update public.credit_lots
    set remaining_credits = remaining_credits - v_take
    where id = v_lot.id;

    insert into public.credit_reservation_allocations (
      owner_user_id, reservation_id, credit_lot_id, allocated_credits
    ) values (
      v_actor_id, v_reservation_id, v_lot.id, v_take
    );

    v_remaining := v_remaining - v_take;
  end loop;

  if v_remaining <> 0 then
    raise exception 'credit account requires reconciliation' using errcode = '55000';
  end if;

  update public.credit_accounts
  set available_credits = available_credits - v_quote.credits_cost,
      reserved_credits = reserved_credits + v_quote.credits_cost
  where owner_user_id = v_actor_id;

  if v_quote.credits_cost > 0 then
    insert into public.ledger_entries (
      owner_user_id, entry_kind, amount_credits, reason, generation_task_id
    ) values (
      v_actor_id, 'debit', v_quote.credits_cost, 'generation.reserve', v_task_id
    );
  end if;

  insert into public.idempotency_records (
    actor_user_id, operation, client_key, request_hash, result_reference
  ) values (
    v_actor_id,
    'generation.submit',
    p_client_key,
    p_request_hash,
    jsonb_build_object(
      'generation_task_id', v_task_id,
      'reservation_id', v_reservation_id,
      'credits_reserved', v_quote.credits_cost
    )
  );

  insert into public.outbox_events (aggregate_type, aggregate_id, event_type, payload)
  values (
    'generation_task',
    v_task_id,
    'generation.provider_submit_requested',
    jsonb_build_object('generation_task_id', v_task_id)
  );

  return query select v_task_id, v_reservation_id, v_quote.credits_cost, false;
end;
$$;

create or replace function public.record_generation_provider_submission(
  p_task_id uuid,
  p_external_task_id text,
  p_request_hash char(64),
  p_model_key text
)
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_task public.generation_tasks%rowtype;
begin
  if auth.role() <> 'service_role' then
    raise exception 'service role required' using errcode = '42501';
  end if;

  select * into v_task from public.generation_tasks where id = p_task_id for update;
  if v_task.id is null then
    raise exception 'generation task is unavailable' using errcode = '22023';
  end if;

  if v_task.status = 'queued' and v_task.provider_reference = p_external_task_id then
    return;
  end if;

  if v_task.status <> 'reserving' or v_task.model_key <> p_model_key then
    raise exception 'generation task cannot accept provider submission'
      using errcode = '22023';
  end if;

  insert into public.provider_attempts (
    generation_task_id,
    provider_key,
    model_key,
    external_task_id,
    request_hash,
    status
  ) values (
    p_task_id,
    'fal',
    p_model_key,
    p_external_task_id,
    p_request_hash,
    'submitted'
  );

  update public.generation_tasks
  set provider_reference = p_external_task_id,
      status = 'queued',
      queued_at = timezone('utc', now())
  where id = p_task_id;

  insert into public.outbox_events (aggregate_type, aggregate_id, event_type, payload)
  values (
    'generation_task',
    p_task_id,
    'generation.provider_submitted',
    jsonb_build_object('external_task_id', p_external_task_id)
  ) on conflict (aggregate_type, aggregate_id, event_type) do nothing;
end;
$$;

create or replace function public.mark_generation_reconciliation_required(
  p_task_id uuid,
  p_external_task_id text,
  p_request_hash char(64),
  p_model_key text
)
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_task public.generation_tasks%rowtype;
begin
  if auth.role() <> 'service_role' then
    raise exception 'service role required' using errcode = '42501';
  end if;

  select * into v_task from public.generation_tasks where id = p_task_id for update;
  if v_task.id is null then
    raise exception 'generation task is unavailable' using errcode = '22023';
  end if;

  if v_task.status = 'reconciliation_required'
    and v_task.provider_reference = p_external_task_id then
    return;
  end if;

  if v_task.status <> 'reserving' or v_task.model_key <> p_model_key then
    raise exception 'generation task cannot enter reconciliation'
      using errcode = '22023';
  end if;

  insert into public.provider_attempts (
    generation_task_id,
    provider_key,
    model_key,
    external_task_id,
    request_hash,
    status
  ) values (
    p_task_id,
    'fal',
    p_model_key,
    p_external_task_id,
    p_request_hash,
    'unknown'
  ) on conflict (provider_key, external_task_id) do nothing;

  update public.generation_tasks
  set provider_reference = p_external_task_id,
      status = 'reconciliation_required'
  where id = p_task_id;

  insert into public.outbox_events (aggregate_type, aggregate_id, event_type, payload)
  values (
    'generation_task',
    p_task_id,
    'generation.reconciliation_required',
    jsonb_build_object('external_task_id', p_external_task_id)
  ) on conflict (aggregate_type, aggregate_id, event_type) do nothing;
end;
$$;

create or replace function public.compensate_generation_task(
  p_task_id uuid,
  p_failure_code text
)
returns boolean
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_task public.generation_tasks%rowtype;
  v_reservation public.credit_reservations%rowtype;
begin
  if auth.role() <> 'service_role' then
    raise exception 'service role required' using errcode = '42501';
  end if;

  select * into v_task from public.generation_tasks where id = p_task_id for update;
  if v_task.id is null then
    raise exception 'generation task is unavailable' using errcode = '22023';
  end if;

  if v_task.status in ('succeeded', 'failed', 'canceled', 'expired') then
    return false;
  end if;

  select * into v_reservation
  from public.credit_reservations
  where generation_task_id = p_task_id
  for update;

  if v_reservation.id is null or v_reservation.status <> 'reserved' then
    raise exception 'credit reservation is unavailable' using errcode = '55000';
  end if;

  perform 1 from public.credit_accounts
  where owner_user_id = v_task.owner_user_id for update;

  update public.credit_lots lot
  set remaining_credits = lot.remaining_credits + allocation.allocated_credits
  from public.credit_reservation_allocations allocation
  where allocation.reservation_id = v_reservation.id
    and allocation.credit_lot_id = lot.id;

  update public.credit_accounts
  set available_credits = available_credits + v_reservation.reserved_credits,
      reserved_credits = reserved_credits - v_reservation.reserved_credits
  where owner_user_id = v_task.owner_user_id;

  update public.credit_reservations
  set status = 'compensated', settled_credits = 0
  where id = v_reservation.id;

  if v_reservation.reserved_credits > 0 then
    insert into public.ledger_entries (
      owner_user_id, entry_kind, amount_credits, reason, generation_task_id
    ) values (
      v_task.owner_user_id,
      'credit',
      v_reservation.reserved_credits,
      'generation.compensation',
      p_task_id
    ) on conflict (generation_task_id, reason) where generation_task_id is not null
      do nothing;
  end if;

  update public.generation_tasks
  set status = 'failed',
      failure_code = p_failure_code,
      completed_at = timezone('utc', now())
  where id = p_task_id;

  return true;
end;
$$;

create or replace function public.get_fal_webhook_context(
  p_external_task_id text
)
returns table (
  task_id uuid,
  normalized_input jsonb,
  task_status public.generation_status
)
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if auth.role() <> 'service_role' then
    raise exception 'service role required' using errcode = '42501';
  end if;

  return query
    select task.id, task.normalized_input, task.status
    from public.provider_attempts attempt
    join public.generation_tasks task on task.id = attempt.generation_task_id
    where attempt.provider_key = 'fal'
      and attempt.external_task_id = p_external_task_id;
end;
$$;

create or replace function public.finalize_fal_webhook_event(
  p_external_task_id text,
  p_payload_hash char(64),
  p_payload jsonb,
  p_succeeded boolean,
  p_result_reference jsonb default null,
  p_failure_code text default null
)
returns table (task_id uuid, was_replayed boolean, task_status public.generation_status)
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_task public.generation_tasks%rowtype;
  v_attempt public.provider_attempts%rowtype;
  v_reservation public.credit_reservations%rowtype;
  v_event_id uuid;
begin
  if auth.role() <> 'service_role' then
    raise exception 'service role required' using errcode = '42501';
  end if;

  select attempt.* into v_attempt
  from public.provider_attempts attempt
  where attempt.provider_key = 'fal'
    and attempt.external_task_id = p_external_task_id
  for update;

  if v_attempt.id is null then
    raise exception 'unknown fal external task' using errcode = '22023';
  end if;

  select * into v_task
  from public.generation_tasks
  where id = v_attempt.generation_task_id
  for update;

  insert into public.provider_webhook_events (
    provider_key, generation_task_id, external_task_id, payload_hash, payload
  ) values (
    'fal', v_task.id, p_external_task_id, p_payload_hash, p_payload
  ) on conflict (provider_key, external_task_id, payload_hash) do nothing
  returning id into v_event_id;

  if v_event_id is null then
    return query select v_task.id, true, v_task.status;
    return;
  end if;

  insert into public.outbox_events (aggregate_type, aggregate_id, event_type, payload)
  values (
    'generation_task',
    v_task.id,
    'generation.fal_webhook_received',
    jsonb_build_object('provider_webhook_event_id', v_event_id)
  ) on conflict (aggregate_type, aggregate_id, event_type) do nothing;

  if v_task.status in ('succeeded', 'failed', 'canceled', 'expired') then
    return query select v_task.id, false, v_task.status;
    return;
  end if;

  select * into v_reservation
  from public.credit_reservations
  where generation_task_id = v_task.id
  for update;

  if v_reservation.id is null or v_reservation.status <> 'reserved' then
    raise exception 'credit reservation is unavailable' using errcode = '55000';
  end if;

  perform 1 from public.credit_accounts
  where owner_user_id = v_task.owner_user_id for update;

  if p_succeeded then
    if p_result_reference is null or jsonb_typeof(p_result_reference) <> 'object' then
      raise exception 'successful generation requires a result reference'
        using errcode = '22023';
    end if;

    update public.credit_accounts
    set reserved_credits = reserved_credits - v_reservation.reserved_credits
    where owner_user_id = v_task.owner_user_id;

    update public.credit_reservations
    set status = 'settled', settled_credits = v_reservation.reserved_credits
    where id = v_reservation.id;

    update public.provider_attempts
    set status = 'succeeded'
    where id = v_attempt.id;

    update public.generation_tasks
    set status = 'succeeded',
        result_reference = p_result_reference,
        failure_code = null,
        completed_at = timezone('utc', now())
    where id = v_task.id;

    insert into public.outbox_events (aggregate_type, aggregate_id, event_type, payload)
    values (
      'generation_task',
      v_task.id,
      'generation.succeeded',
      jsonb_build_object('credits_settled', v_reservation.reserved_credits)
    ) on conflict (aggregate_type, aggregate_id, event_type) do nothing;

    return query select v_task.id, false, 'succeeded'::public.generation_status;
    return;
  end if;

  update public.credit_lots lot
  set remaining_credits = lot.remaining_credits + allocation.allocated_credits
  from public.credit_reservation_allocations allocation
  where allocation.reservation_id = v_reservation.id
    and allocation.credit_lot_id = lot.id;

  update public.credit_accounts
  set available_credits = available_credits + v_reservation.reserved_credits,
      reserved_credits = reserved_credits - v_reservation.reserved_credits
  where owner_user_id = v_task.owner_user_id;

  update public.credit_reservations
  set status = 'compensated', settled_credits = 0
  where id = v_reservation.id;

  if v_reservation.reserved_credits > 0 then
    insert into public.ledger_entries (
      owner_user_id, entry_kind, amount_credits, reason, generation_task_id
    ) values (
      v_task.owner_user_id,
      'credit',
      v_reservation.reserved_credits,
      'generation.compensation',
      v_task.id
    ) on conflict (generation_task_id, reason) where generation_task_id is not null
      do nothing;
  end if;

  update public.provider_attempts
  set status = 'failed', safe_error_code = coalesce(p_failure_code, 'provider_failed')
  where id = v_attempt.id;

  update public.generation_tasks
  set status = 'failed',
      failure_code = coalesce(p_failure_code, 'provider_failed'),
      completed_at = timezone('utc', now())
  where id = v_task.id;

  insert into public.outbox_events (aggregate_type, aggregate_id, event_type, payload)
  values (
    'generation_task',
    v_task.id,
    'generation.failed',
    jsonb_build_object('credits_compensated', v_reservation.reserved_credits)
  ) on conflict (aggregate_type, aggregate_id, event_type) do nothing;

  return query select v_task.id, false, 'failed'::public.generation_status;
end;
$$;

drop function if exists public.record_fal_webhook_event(text, char, jsonb);

revoke all on function public.generation_parameter_key(public.generation_modality, jsonb) from public;
revoke all on function public.create_generation_quote(public.generation_modality, text, jsonb) from public;
revoke all on function public.submit_generation_task(uuid, char, public.generation_modality, text, jsonb, uuid) from public;
revoke all on function public.record_generation_provider_submission(uuid, text, char, text) from public;
revoke all on function public.mark_generation_reconciliation_required(uuid, text, char, text) from public;
revoke all on function public.compensate_generation_task(uuid, text) from public;
revoke all on function public.get_fal_webhook_context(text) from public;
revoke all on function public.finalize_fal_webhook_event(text, char, jsonb, boolean, jsonb, text) from public;

grant execute on function public.create_generation_quote(public.generation_modality, text, jsonb) to authenticated;
grant execute on function public.submit_generation_task(uuid, char, public.generation_modality, text, jsonb, uuid) to authenticated;
grant execute on function public.record_generation_provider_submission(uuid, text, char, text) to service_role;
grant execute on function public.mark_generation_reconciliation_required(uuid, text, char, text) to service_role;
grant execute on function public.compensate_generation_task(uuid, text) to service_role;
grant execute on function public.get_fal_webhook_context(text) to service_role;
grant execute on function public.finalize_fal_webhook_event(text, char, jsonb, boolean, jsonb, text) to service_role;

commit;
