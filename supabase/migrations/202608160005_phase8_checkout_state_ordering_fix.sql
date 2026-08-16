-- Phase 8 Stripe repair: a Checkout completion is linkage evidence, not an
-- authoritative subscription state. Its timestamp must not outrank an
-- invoice.paid or subscription event that Stripe created moments earlier.
begin;

do $repair$
declare
  v_function regprocedure :=
    'public.process_stripe_event(text,text,timestamptz,jsonb,jsonb)'::regprocedure;
  v_definition text;
  v_fixed text;
begin
  select pg_get_functiondef(v_function) into v_definition;
  v_fixed := regexp_replace(
    v_definition,
    $pattern$('pending',[[:space:]]*v_product_key,[[:space:]]*v_customer_id,[[:space:]]*v_price_id,[[:space:]]*v_credits,[[:space:]]*)p_event_created_at$pattern$,
    E'\\1null',
    'n'
  );

  if v_fixed <> v_definition then
    execute v_fixed;
  elsif position($fixed$'pending',$fixed$ in v_definition) = 0 then
    raise exception 'Phase 8 checkout-state repair could not find the expected subscription insert';
  end if;
end;
$repair$;

-- Repair the affected real Sandbox checkout without altering Credits or Ledger.
update public.subscriptions as subscription
set status = 'active',
    stripe_state_updated_at = coalesce(payment.stripe_state_updated_at, subscription.stripe_state_updated_at)
from public.payments as payment
where subscription.payment_id = payment.id
  and subscription.stripe_subscription_id = payment.stripe_subscription_id
  and payment.status = 'paid'
  and subscription.status = 'pending';

commit;
