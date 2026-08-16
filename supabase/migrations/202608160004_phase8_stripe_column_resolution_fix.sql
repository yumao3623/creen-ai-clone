-- Phase 8 Stripe repair: rebuild the existing function with a local
-- PL/pgSQL name-resolution directive. Supabase forbids setting this GUC via
-- ALTER FUNCTION.
begin;

do $$
declare
  v_function regprocedure :=
    'public.process_stripe_event(text,text,timestamptz,jsonb,jsonb)'::regprocedure;
  v_definition text;
  v_fixed text;
begin
  select pg_get_functiondef(v_function) into v_definition;
  if position('#variable_conflict use_column' in v_definition) = 0 then
    v_fixed := regexp_replace(
      v_definition,
      'declare',
      E'#variable_conflict use_column\ndeclare',
      'i'
    );

    if v_fixed = v_definition then
      raise exception 'Phase 8 Stripe repair could not find the function declaration marker';
    end if;

    execute v_fixed;
  end if;
end;
$$;

commit;
