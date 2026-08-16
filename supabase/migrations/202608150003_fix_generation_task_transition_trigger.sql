-- The original transition trigger delegated to another trigger-only function.
-- PostgreSQL rejects that invocation during any generation_tasks update.
begin;

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
    or (old.status = 'processing' and new.status in ('succeeded', 'failed', 'canceled', 'expired', 'reconciliation_required'))
    or (old.status = 'reconciliation_required' and new.status in ('queued', 'processing', 'succeeded', 'failed', 'canceled'))
  ) then
    raise exception 'invalid generation state transition: % -> %', old.status, new.status
      using errcode = '22023';
  end if;

  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

commit;
