-- Phase 5 core domain. This migration is intentionally re-runnable in an
-- empty development database; production deployments should apply it once
-- through the Supabase migration history.
begin;

create extension if not exists pgcrypto;

do $$
begin
  create type public.generation_modality as enum (
    'text_to_image', 'image_to_video', 'text_to_speech'
  );
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.generation_status as enum (
    'draft', 'quoted', 'reserving', 'queued', 'processing', 'succeeded',
    'failed', 'canceled', 'expired', 'reconciliation_required'
  );
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.provider_attempt_status as enum (
    'created', 'submitted', 'processing', 'succeeded', 'failed', 'unknown'
  );
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.credit_reservation_status as enum (
    'reserved', 'settled', 'released', 'compensated'
  );
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.ledger_entry_kind as enum ('credit', 'debit');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.payment_status as enum (
    'pending', 'paid', 'failed', 'canceled', 'refunded'
  );
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.outbox_status as enum ('pending', 'processing', 'published', 'failed');
exception when duplicate_object then null;
end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.reject_mutation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception '% is append-only', tg_table_name using errcode = '55000';
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  stripe_customer_id text unique,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.price_versions (
  id uuid primary key default gen_random_uuid(),
  version_key text not null unique check (version_key ~ '^[a-z0-9][a-z0-9_.-]{1,63}$'),
  effective_from timestamptz not null,
  effective_to timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  check (effective_to is null or effective_to > effective_from)
);

create table if not exists public.model_prices (
  id uuid primary key default gen_random_uuid(),
  price_version_id uuid not null references public.price_versions(id) on delete restrict,
  modality public.generation_modality not null,
  model_key text not null check (model_key ~ '^[a-z0-9][a-z0-9_.-]{1,127}$'),
  parameter_key text not null default 'default' check (parameter_key ~ '^[a-z0-9][a-z0-9_.-]{1,127}$'),
  credits_cost bigint not null check (credits_cost >= 0),
  provider_currency char(3),
  provider_cost_microunits bigint check (provider_cost_microunits >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  unique (price_version_id, modality, model_key, parameter_key),
  check (
    (provider_currency is null and provider_cost_microunits is null)
    or (provider_currency is not null and provider_cost_microunits is not null)
  )
);

create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.profiles(id) on delete cascade,
  price_version_id uuid not null references public.price_versions(id) on delete restrict,
  parameters_hash char(64) not null check (parameters_hash ~ '^[0-9a-f]{64}$'),
  credits_cost bigint not null check (credits_cost >= 0),
  expires_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now()),
  check (expires_at > created_at)
);

create table if not exists public.credit_accounts (
  owner_user_id uuid primary key references public.profiles(id) on delete cascade,
  available_credits bigint not null default 0 check (available_credits >= 0),
  reserved_credits bigint not null default 0 check (reserved_credits >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.profiles(id) on delete cascade,
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text unique,
  product_key text not null check (product_key ~ '^[a-z0-9][a-z0-9_.-]{1,127}$'),
  status public.payment_status not null default 'pending',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.profiles(id) on delete cascade,
  payment_id uuid references public.payments(id) on delete set null,
  stripe_subscription_id text not null unique,
  status text not null,
  current_period_end timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.generation_tasks (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.profiles(id) on delete cascade,
  modality public.generation_modality not null,
  model_key text not null check (model_key ~ '^[a-z0-9][a-z0-9_.-]{1,127}$'),
  normalized_input jsonb not null check (jsonb_typeof(normalized_input) = 'object'),
  quote_id uuid not null references public.quotes(id) on delete restrict,
  status public.generation_status not null default 'draft',
  provider_reference text unique,
  result_reference jsonb,
  failure_code text,
  queued_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (
    (status <> 'succeeded' or result_reference is not null)
    and (status not in ('succeeded', 'failed', 'canceled', 'expired') or completed_at is not null)
  )
);

create table if not exists public.provider_attempts (
  id uuid primary key default gen_random_uuid(),
  generation_task_id uuid not null references public.generation_tasks(id) on delete cascade,
  provider_key text not null check (provider_key ~ '^[a-z0-9][a-z0-9_.-]{1,127}$'),
  model_key text not null check (model_key ~ '^[a-z0-9][a-z0-9_.-]{1,127}$'),
  provider_model_version text,
  external_task_id text not null,
  request_hash char(64) not null check (request_hash ~ '^[0-9a-f]{64}$'),
  status public.provider_attempt_status not null default 'created',
  safe_error_code text,
  provider_cost_microunits bigint check (provider_cost_microunits >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (provider_key, external_task_id)
);

create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.profiles(id) on delete cascade,
  generation_task_id uuid references public.generation_tasks(id) on delete set null,
  purpose text not null check (purpose in ('input', 'result')),
  mime_type text not null check (mime_type ~ '^[a-z0-9][a-z0-9!#$&^_.+-]*/[a-z0-9][a-z0-9!#$&^_.+-]*$'),
  byte_size bigint not null check (byte_size >= 0),
  storage_path text,
  provider_url text,
  expires_at timestamptz,
  safety_status text not null default 'pending',
  created_at timestamptz not null default timezone('utc', now()),
  check (num_nonnulls(storage_path, provider_url) = 1)
);

create table if not exists public.credit_lots (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.profiles(id) on delete cascade,
  payment_id uuid references public.payments(id) on delete set null,
  source text not null check (source in ('subscription', 'recurring_credit_pack', 'manual_adjustment')),
  granted_credits bigint not null check (granted_credits > 0),
  remaining_credits bigint not null check (remaining_credits between 0 and granted_credits),
  expires_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.credit_reservations (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.profiles(id) on delete cascade,
  generation_task_id uuid not null unique references public.generation_tasks(id) on delete restrict,
  quote_id uuid not null references public.quotes(id) on delete restrict,
  reserved_credits bigint not null check (reserved_credits >= 0),
  status public.credit_reservation_status not null default 'reserved',
  settled_credits bigint check (settled_credits is null or settled_credits >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (settled_credits is null or settled_credits <= reserved_credits)
);

create table if not exists public.ledger_entries (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.profiles(id) on delete cascade,
  entry_kind public.ledger_entry_kind not null,
  amount_credits bigint not null check (amount_credits > 0),
  reason text not null check (reason ~ '^[a-z0-9][a-z0-9_.-]{1,127}$'),
  generation_task_id uuid references public.generation_tasks(id) on delete restrict,
  payment_id uuid references public.payments(id) on delete restrict,
  idempotency_key uuid,
  created_at timestamptz not null default timezone('utc', now()),
  check (num_nonnulls(generation_task_id, payment_id) <= 1)
);

create unique index if not exists ledger_entries_idempotency_key_unique
  on public.ledger_entries (idempotency_key) where idempotency_key is not null;
create unique index if not exists ledger_entries_task_reason_unique
  on public.ledger_entries (generation_task_id, reason) where generation_task_id is not null;

create table if not exists public.stripe_events (
  id uuid primary key default gen_random_uuid(),
  stripe_event_id text not null unique,
  event_type text not null,
  received_at timestamptz not null default timezone('utc', now()),
  processed_at timestamptz,
  processing_error text,
  payload jsonb not null check (jsonb_typeof(payload) = 'object')
);

create table if not exists public.idempotency_records (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null references public.profiles(id) on delete cascade,
  operation text not null check (operation ~ '^[a-z0-9][a-z0-9_.-]{1,127}$'),
  client_key uuid not null,
  request_hash char(64) not null check (request_hash ~ '^[0-9a-f]{64}$'),
  result_reference jsonb not null check (jsonb_typeof(result_reference) = 'object'),
  created_at timestamptz not null default timezone('utc', now()),
  unique (actor_user_id, operation, client_key)
);

create table if not exists public.outbox_events (
  id uuid primary key default gen_random_uuid(),
  aggregate_type text not null check (aggregate_type ~ '^[a-z0-9][a-z0-9_.-]{1,127}$'),
  aggregate_id uuid not null,
  event_type text not null check (event_type ~ '^[a-z0-9][a-z0-9_.-]{1,127}$'),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  status public.outbox_status not null default 'pending',
  attempts integer not null default 0 check (attempts >= 0),
  available_at timestamptz not null default timezone('utc', now()),
  published_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  unique (aggregate_type, aggregate_id, event_type)
);

create index if not exists generation_tasks_owner_created_at_idx
  on public.generation_tasks (owner_user_id, created_at desc);
create index if not exists quotes_owner_expires_at_idx
  on public.quotes (owner_user_id, expires_at desc);
create index if not exists provider_attempts_task_idx
  on public.provider_attempts (generation_task_id, created_at desc);
create index if not exists outbox_events_pending_idx
  on public.outbox_events (available_at, created_at)
  where status in ('pending', 'failed');

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, nullif(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;

  insert into public.credit_accounts (owner_user_id)
  values (new.id)
  on conflict (owner_user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_auth_user();

-- Auth can predate this migration, so bring existing users into the same
-- one-to-one mapping without touching any user-provided profile values.
insert into public.profiles (id)
select id from auth.users
on conflict (id) do nothing;

insert into public.credit_accounts (owner_user_id)
select id from public.profiles
on conflict (owner_user_id) do nothing;

create or replace function public.assert_generation_task_transition()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.owner_user_id <> old.owner_user_id
    or new.modality <> old.modality
    or new.model_key <> old.model_key
    or new.normalized_input <> old.normalized_input
    or new.quote_id <> old.quote_id then
    raise exception 'generation task identity is immutable' using errcode = '55000';
  end if;

  if new.status <> old.status and not (
    (old.status = 'draft' and new.status in ('quoted', 'failed', 'canceled', 'expired'))
    or (old.status = 'quoted' and new.status in ('reserving', 'failed', 'canceled', 'expired'))
    or (old.status = 'reserving' and new.status in ('queued', 'failed', 'canceled', 'reconciliation_required'))
    or (old.status = 'queued' and new.status in ('processing', 'succeeded', 'failed', 'canceled', 'expired', 'reconciliation_required'))
    or (old.status = 'processing' and new.status in ('succeeded', 'failed', 'canceled', 'reconciliation_required'))
    or (old.status = 'reconciliation_required' and new.status in ('queued', 'processing', 'succeeded', 'failed', 'canceled'))
  ) then
    raise exception 'invalid generation state transition: % -> %', old.status, new.status
      using errcode = '22023';
  end if;

  return public.set_updated_at();
end;
$$;

drop trigger if exists generation_tasks_transition_guard on public.generation_tasks;
create trigger generation_tasks_transition_guard
  before update on public.generation_tasks
  for each row execute procedure public.assert_generation_task_transition();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute procedure public.set_updated_at();
drop trigger if exists credit_accounts_set_updated_at on public.credit_accounts;
create trigger credit_accounts_set_updated_at before update on public.credit_accounts
  for each row execute procedure public.set_updated_at();
drop trigger if exists payments_set_updated_at on public.payments;
create trigger payments_set_updated_at before update on public.payments
  for each row execute procedure public.set_updated_at();
drop trigger if exists subscriptions_set_updated_at on public.subscriptions;
create trigger subscriptions_set_updated_at before update on public.subscriptions
  for each row execute procedure public.set_updated_at();
drop trigger if exists provider_attempts_set_updated_at on public.provider_attempts;
create trigger provider_attempts_set_updated_at before update on public.provider_attempts
  for each row execute procedure public.set_updated_at();
drop trigger if exists credit_reservations_set_updated_at on public.credit_reservations;
create trigger credit_reservations_set_updated_at before update on public.credit_reservations
  for each row execute procedure public.set_updated_at();

drop trigger if exists price_versions_append_only on public.price_versions;
create trigger price_versions_append_only before update or delete on public.price_versions
  for each row execute procedure public.reject_mutation();
drop trigger if exists model_prices_append_only on public.model_prices;
create trigger model_prices_append_only before update or delete on public.model_prices
  for each row execute procedure public.reject_mutation();
drop trigger if exists ledger_entries_append_only on public.ledger_entries;
create trigger ledger_entries_append_only before update or delete on public.ledger_entries
  for each row execute procedure public.reject_mutation();

create or replace function public.submit_generation_task(
  p_client_key uuid,
  p_request_hash char(64),
  p_modality public.generation_modality,
  p_model_key text,
  p_normalized_input jsonb,
  p_quote_id uuid
)
returns table (task_id uuid, was_replayed boolean)
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_actor_id uuid := auth.uid();
  v_existing public.idempotency_records%rowtype;
  v_task_id uuid;
begin
  if v_actor_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  -- The unique index is the durable guarantee. This lock makes a concurrent
  -- duplicate wait for the first transaction, then return its durable result.
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

    return query select (v_existing.result_reference ->> 'generation_task_id')::uuid, true;
    return;
  end if;

  perform 1
  from public.quotes
  where id = p_quote_id and owner_user_id = v_actor_id and expires_at > timezone('utc', now());
  if not found then
    raise exception 'quote is unavailable' using errcode = '22023';
  end if;

  insert into public.generation_tasks (
    owner_user_id, modality, model_key, normalized_input, quote_id, status
  ) values (
    v_actor_id, p_modality, p_model_key, p_normalized_input, p_quote_id, 'quoted'
  ) returning id into v_task_id;

  insert into public.idempotency_records (
    actor_user_id, operation, client_key, request_hash, result_reference
  ) values (
    v_actor_id, 'generation.submit', p_client_key, p_request_hash,
    jsonb_build_object('generation_task_id', v_task_id)
  );

  insert into public.outbox_events (aggregate_type, aggregate_id, event_type, payload)
  values (
    'generation_task', v_task_id, 'generation.submit_requested',
    jsonb_build_object('generation_task_id', v_task_id)
  );

  return query select v_task_id, false;
end;
$$;

alter table public.profiles enable row level security;
alter table public.price_versions enable row level security;
alter table public.model_prices enable row level security;
alter table public.quotes enable row level security;
alter table public.credit_accounts enable row level security;
alter table public.payments enable row level security;
alter table public.subscriptions enable row level security;
alter table public.generation_tasks enable row level security;
alter table public.provider_attempts enable row level security;
alter table public.media_assets enable row level security;
alter table public.credit_lots enable row level security;
alter table public.credit_reservations enable row level security;
alter table public.ledger_entries enable row level security;
alter table public.stripe_events enable row level security;
alter table public.idempotency_records enable row level security;
alter table public.outbox_events enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles for select to authenticated using ((select auth.uid()) = id);
drop policy if exists profiles_update_own on public.profiles;

drop policy if exists price_versions_read_authenticated on public.price_versions;
create policy price_versions_read_authenticated on public.price_versions for select to authenticated using (true);
drop policy if exists model_prices_read_authenticated on public.model_prices;
create policy model_prices_read_authenticated on public.model_prices for select to authenticated using (true);

drop policy if exists quotes_select_own on public.quotes;
create policy quotes_select_own on public.quotes for select to authenticated using ((select auth.uid()) = owner_user_id);
drop policy if exists credit_accounts_select_own on public.credit_accounts;
create policy credit_accounts_select_own on public.credit_accounts for select to authenticated using ((select auth.uid()) = owner_user_id);
drop policy if exists payments_select_own on public.payments;
create policy payments_select_own on public.payments for select to authenticated using ((select auth.uid()) = owner_user_id);
drop policy if exists subscriptions_select_own on public.subscriptions;
create policy subscriptions_select_own on public.subscriptions for select to authenticated using ((select auth.uid()) = owner_user_id);
drop policy if exists generation_tasks_select_own on public.generation_tasks;
create policy generation_tasks_select_own on public.generation_tasks for select to authenticated using ((select auth.uid()) = owner_user_id);
drop policy if exists provider_attempts_select_own on public.provider_attempts;
create policy provider_attempts_select_own on public.provider_attempts for select to authenticated using (
  exists (select 1 from public.generation_tasks task where task.id = generation_task_id and task.owner_user_id = (select auth.uid()))
);
drop policy if exists media_assets_select_own on public.media_assets;
create policy media_assets_select_own on public.media_assets for select to authenticated using ((select auth.uid()) = owner_user_id);
drop policy if exists credit_lots_select_own on public.credit_lots;
create policy credit_lots_select_own on public.credit_lots for select to authenticated using ((select auth.uid()) = owner_user_id);
drop policy if exists credit_reservations_select_own on public.credit_reservations;
create policy credit_reservations_select_own on public.credit_reservations for select to authenticated using ((select auth.uid()) = owner_user_id);
drop policy if exists ledger_entries_select_own on public.ledger_entries;
create policy ledger_entries_select_own on public.ledger_entries for select to authenticated using ((select auth.uid()) = owner_user_id);
drop policy if exists idempotency_records_select_own on public.idempotency_records;
create policy idempotency_records_select_own on public.idempotency_records for select to authenticated using ((select auth.uid()) = actor_user_id);

revoke all on function public.submit_generation_task(uuid, char, public.generation_modality, text, jsonb, uuid) from public;
grant execute on function public.submit_generation_task(uuid, char, public.generation_modality, text, jsonb, uuid) to authenticated;

commit;
