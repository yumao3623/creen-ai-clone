-- Phase 6 fal webhook receipt. A successful provider event is persisted as
-- evidence and queued for Phase 7 settlement; this migration never fabricates
-- a result or bypasses the Credits transaction boundary.
begin;

create table if not exists public.provider_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider_key text not null check (provider_key = 'fal'),
  generation_task_id uuid not null references public.generation_tasks(id) on delete cascade,
  external_task_id text not null,
  payload_hash char(64) not null check (payload_hash ~ '^[0-9a-f]{64}$'),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  received_at timestamptz not null default timezone('utc', now()),
  unique (provider_key, external_task_id, payload_hash)
);

create index if not exists provider_webhook_events_task_received_idx
  on public.provider_webhook_events (generation_task_id, received_at desc);

create or replace function public.record_fal_webhook_event(
  p_external_task_id text,
  p_payload_hash char(64),
  p_payload jsonb
)
returns table (task_id uuid, was_replayed boolean)
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_task_id uuid;
  v_event_id uuid;
begin
  if auth.role() <> 'service_role' then
    raise exception 'service role required' using errcode = '42501';
  end if;

  select generation_task_id into v_task_id
  from public.provider_attempts
  where provider_key = 'fal' and external_task_id = p_external_task_id;

  if v_task_id is null then
    raise exception 'unknown fal external task' using errcode = '22023';
  end if;

  insert into public.provider_webhook_events (
    provider_key, generation_task_id, external_task_id, payload_hash, payload
  ) values (
    'fal', v_task_id, p_external_task_id, p_payload_hash, p_payload
  ) on conflict (provider_key, external_task_id, payload_hash) do nothing
  returning id into v_event_id;

  if v_event_id is null then
    return query select v_task_id, true;
    return;
  end if;

  insert into public.outbox_events (aggregate_type, aggregate_id, event_type, payload)
  values (
    'generation_task', v_task_id, 'generation.fal_webhook_received',
    jsonb_build_object('provider_webhook_event_id', v_event_id)
  ) on conflict (aggregate_type, aggregate_id, event_type) do nothing;

  return query select v_task_id, false;
end;
$$;

alter table public.provider_webhook_events enable row level security;

revoke all on function public.record_fal_webhook_event(text, char, jsonb) from public;
grant execute on function public.record_fal_webhook_event(text, char, jsonb) to service_role;

commit;
