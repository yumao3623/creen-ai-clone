-- Delivery Enhancement A: model-aware prices for the verified/candidate registry.
-- This reuses the existing price version and model_prices contract.
begin;

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
  ('text_to_image'::public.generation_modality, 'fal.flux.dev', 'default', 250::bigint, 25000::bigint),
  ('text_to_image'::public.generation_modality, 'fal.flux.dev.image_to_image', 'default', 300::bigint, 30000::bigint),
  ('image_to_video'::public.generation_modality, 'fal.kling.v3.standard.image_to_video', 'duration_5', 4200::bigint, 420000::bigint),
  ('image_to_video'::public.generation_modality, 'fal.kling.v3.standard.image_to_video', 'duration_10', 8400::bigint, 840000::bigint),
  ('text_to_speech'::public.generation_modality, 'fal.minimax.speech_2_8_turbo', 'characters_10', 6::bigint, 600::bigint)
) as price(modality, model_key, parameter_key, credits_cost, provider_cost_microunits)
where version.version_key = 'production.credits.v1'
on conflict (price_version_id, modality, model_key, parameter_key) do nothing;

drop function if exists public.get_fal_webhook_context(text);

create function public.get_fal_webhook_context(
  p_external_task_id text
)
returns table (
  task_id uuid,
  model_key text,
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
    select task.id, task.model_key, task.normalized_input, task.status
    from public.provider_attempts attempt
    join public.generation_tasks task on task.id = attempt.generation_task_id
    where attempt.provider_key = 'fal'
      and attempt.external_task_id = p_external_task_id;
end;
$$;

revoke all on function public.get_fal_webhook_context(text) from public;
grant execute on function public.get_fal_webhook_context(text) to service_role;

commit;
