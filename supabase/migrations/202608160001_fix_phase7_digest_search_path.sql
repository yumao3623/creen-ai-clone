-- Supabase installs pgcrypto in the extensions schema. The Phase 7 quote and
-- reservation functions call digest(), so their fixed security-definer search
-- path must include that schema.
begin;

alter function public.create_generation_quote(
  public.generation_modality,
  text,
  jsonb
) set search_path = public, auth, extensions, pg_temp;

alter function public.submit_generation_task(
  uuid,
  char,
  public.generation_modality,
  text,
  jsonb,
  uuid
) set search_path = public, auth, extensions, pg_temp;

commit;
