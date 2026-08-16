-- Phase 8 Stripe repair: the RPC's payment_id output column shadowed the
-- ledger_entries column in the partial unique-index predicate.
begin;

do $$
declare
  v_function regprocedure :=
    'public.process_stripe_event(text,text,timestamptz,jsonb,jsonb)'::regprocedure;
  v_definition text;
  v_legacy text :=
    ') on conflict (payment_id, reason) where payment_id is not null';
  v_fixed text :=
    ') on conflict (payment_id, reason) where public.ledger_entries.payment_id is not null';
begin
  select pg_get_functiondef(v_function) into v_definition;

  if position(v_legacy in v_definition) > 0 then
    execute replace(v_definition, v_legacy, v_fixed);
  elsif position(v_fixed in v_definition) = 0 then
    raise exception 'Phase 8 Stripe repair could not find the expected ledger conflict predicate';
  end if;
end;
$$;

commit;
