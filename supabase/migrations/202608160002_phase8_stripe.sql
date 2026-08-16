-- Phase 8 Stripe: idempotent Checkout commands, signed webhook receipts,
-- invoice-level payment mapping, and atomic recurring credit grants.
begin;

alter table public.payments
  add column if not exists client_key uuid,
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists stripe_invoice_id text,
  add column if not exists stripe_price_id text,
  add column if not exists credits_per_period bigint,
  add column if not exists stripe_state_updated_at timestamptz;

alter table public.payments
  drop constraint if exists payments_credits_per_period_positive,
  add constraint payments_credits_per_period_positive
    check (credits_per_period is null or credits_per_period > 0),
  drop constraint if exists payments_phase8_product_key,
  add constraint payments_phase8_product_key check (
    product_key in ('subscription', 'recurring_credit_pack')
  ) not valid;

create unique index if not exists payments_owner_client_key_unique
  on public.payments (owner_user_id, client_key)
  where client_key is not null;
create unique index if not exists payments_stripe_invoice_id_unique
  on public.payments (stripe_invoice_id)
  where stripe_invoice_id is not null;
create index if not exists payments_stripe_subscription_idx
  on public.payments (stripe_subscription_id, created_at desc)
  where stripe_subscription_id is not null;

alter table public.subscriptions
  add column if not exists product_key text,
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_price_id text,
  add column if not exists credits_per_period bigint,
  add column if not exists stripe_state_updated_at timestamptz;

alter table public.subscriptions
  drop constraint if exists subscriptions_phase8_product_key,
  add constraint subscriptions_phase8_product_key check (
    product_key is null
    or product_key in ('subscription', 'recurring_credit_pack')
  ),
  drop constraint if exists subscriptions_credits_per_period_positive,
  add constraint subscriptions_credits_per_period_positive
    check (credits_per_period is null or credits_per_period > 0);

alter table public.credit_lots
  add column if not exists stripe_invoice_id text;

create unique index if not exists credit_lots_stripe_invoice_id_unique
  on public.credit_lots (stripe_invoice_id)
  where stripe_invoice_id is not null;
create unique index if not exists ledger_entries_payment_reason_unique
  on public.ledger_entries (payment_id, reason)
  where payment_id is not null;

create or replace function public.create_stripe_checkout_command(
  p_client_key uuid,
  p_product_key text,
  p_stripe_price_id text,
  p_credits_per_period bigint
)
returns table (
  payment_id uuid,
  stripe_checkout_session_id text,
  was_replayed boolean
)
language plpgsql
security definer
set search_path = public, auth, extensions, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_payment public.payments%rowtype;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if p_client_key is null
     or p_product_key is null
     or p_product_key not in ('subscription', 'recurring_credit_pack')
     or p_stripe_price_id !~ '^price_[A-Za-z0-9]+$'
     or p_credits_per_period <= 0 then
    raise exception 'invalid Stripe checkout command' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text || ':' || p_client_key::text, 0));

  select * into v_payment
  from public.payments
  where owner_user_id = v_user_id and client_key = p_client_key
  for update;

  if found then
    if v_payment.product_key <> p_product_key
       or v_payment.stripe_price_id <> p_stripe_price_id
       or v_payment.credits_per_period <> p_credits_per_period then
      raise exception 'idempotency key reused with different Stripe checkout command'
        using errcode = '22023';
    end if;

    return query select v_payment.id, v_payment.stripe_checkout_session_id, true;
    return;
  end if;

  insert into public.payments (
    owner_user_id,
    client_key,
    product_key,
    stripe_price_id,
    credits_per_period,
    status
  ) values (
    v_user_id,
    p_client_key,
    p_product_key,
    p_stripe_price_id,
    p_credits_per_period,
    'pending'
  ) returning * into v_payment;

  return query select v_payment.id, null::text, false;
end;
$$;

create or replace function public.attach_stripe_customer(
  p_owner_user_id uuid,
  p_stripe_customer_id text
)
returns void
language plpgsql
security definer
set search_path = public, auth, extensions, pg_temp
as $$
declare
  v_existing text;
begin
  if p_owner_user_id is null or p_stripe_customer_id !~ '^cus_[A-Za-z0-9]+$' then
    raise exception 'invalid Stripe customer mapping' using errcode = '22023';
  end if;

  select stripe_customer_id into v_existing
  from public.profiles
  where id = p_owner_user_id
  for update;

  if not found then
    raise exception 'profile not found' using errcode = 'P0002';
  end if;
  if v_existing is not null and v_existing <> p_stripe_customer_id then
    raise exception 'Stripe customer mapping conflict' using errcode = '23505';
  end if;

  update public.profiles
  set stripe_customer_id = p_stripe_customer_id
  where id = p_owner_user_id;
end;
$$;

create or replace function public.attach_stripe_checkout_session(
  p_payment_id uuid,
  p_stripe_customer_id text,
  p_stripe_checkout_session_id text
)
returns void
language plpgsql
security definer
set search_path = public, auth, extensions, pg_temp
as $$
declare
  v_payment public.payments%rowtype;
begin
  if p_payment_id is null
     or p_stripe_customer_id !~ '^cus_[A-Za-z0-9]+$'
     or p_stripe_checkout_session_id !~ '^cs_(test|live)_[A-Za-z0-9]+$' then
    raise exception 'invalid Stripe Checkout mapping' using errcode = '22023';
  end if;

  select * into v_payment
  from public.payments
  where id = p_payment_id
  for update;

  if not found then
    raise exception 'payment not found' using errcode = 'P0002';
  end if;
  if v_payment.stripe_checkout_session_id is not null
     and v_payment.stripe_checkout_session_id <> p_stripe_checkout_session_id then
    raise exception 'Stripe Checkout mapping conflict' using errcode = '23505';
  end if;

  update public.payments
  set stripe_customer_id = p_stripe_customer_id,
      stripe_checkout_session_id = p_stripe_checkout_session_id
  where id = p_payment_id;
end;
$$;

create or replace function public.process_stripe_event(
  p_stripe_event_id text,
  p_event_type text,
  p_event_created_at timestamptz,
  p_payload jsonb,
  p_normalized jsonb
)
returns table (
  was_replayed boolean,
  processed boolean,
  payment_id uuid,
  credits_granted bigint,
  processing_error text
)
language plpgsql
security definer
set search_path = public, auth, extensions, pg_temp
as $$
#variable_conflict use_column
declare
  v_event public.stripe_events%rowtype;
  v_kind text := p_normalized ->> 'kind';
  v_owner_user_id uuid;
  v_payment_id uuid;
  v_grant_payment_id uuid;
  v_product_key text;
  v_checkout_session_id text;
  v_customer_id text;
  v_subscription_id text;
  v_invoice_id text;
  v_price_id text;
  v_subscription_status text;
  v_credits bigint;
  v_period_end timestamptz;
  v_source text;
  v_existing_payment public.payments%rowtype;
  v_has_initial_payment boolean := false;
  v_has_invoice_payment boolean := false;
  v_error text;
begin
  if p_stripe_event_id !~ '^evt_[A-Za-z0-9]+$'
     or p_event_type not in (
       'checkout.session.completed',
       'checkout.session.expired',
       'invoice.paid',
       'invoice.payment_failed',
       'customer.subscription.created',
       'customer.subscription.updated',
       'customer.subscription.deleted'
     )
     or p_event_created_at is null
     or p_payload is null or jsonb_typeof(p_payload) <> 'object'
     or p_normalized is null or jsonb_typeof(p_normalized) <> 'object' then
    raise exception 'invalid Stripe event' using errcode = '22023';
  end if;

  insert into public.stripe_events (stripe_event_id, event_type, payload)
  values (p_stripe_event_id, p_event_type, p_payload)
  on conflict (stripe_event_id) do nothing;

  select * into v_event
  from public.stripe_events
  where stripe_event_id = p_stripe_event_id
  for update;

  if v_event.event_type <> p_event_type or v_event.payload <> p_payload then
    raise exception 'Stripe event replay payload mismatch' using errcode = '22023';
  end if;
  if v_event.processed_at is not null then
    return query select true, true, null::uuid, 0::bigint, null::text;
    return;
  end if;

  begin
    v_owner_user_id := nullif(p_normalized ->> 'ownerUserId', '')::uuid;
    v_payment_id := nullif(p_normalized ->> 'paymentId', '')::uuid;
    v_product_key := p_normalized ->> 'productKey';
    v_checkout_session_id := p_normalized ->> 'checkoutSessionId';
    v_customer_id := p_normalized ->> 'customerId';
    v_subscription_id := p_normalized ->> 'subscriptionId';
    v_invoice_id := p_normalized ->> 'invoiceId';
    v_price_id := p_normalized ->> 'priceId';
    v_subscription_status := p_normalized ->> 'subscriptionStatus';
    v_credits := nullif(p_normalized ->> 'creditsPerPeriod', '')::bigint;
    v_period_end := nullif(p_normalized ->> 'periodEnd', '')::timestamptz;

    if v_kind in ('checkout_completed', 'checkout_expired') then
      select * into v_existing_payment
      from public.payments
      where id = v_payment_id and owner_user_id = v_owner_user_id
      for update;

      if not found
         or v_existing_payment.product_key <> v_product_key
         or v_existing_payment.stripe_price_id <> v_price_id
         or v_existing_payment.credits_per_period <> v_credits then
        raise exception 'Stripe Checkout metadata does not match payment command';
      end if;

      if v_kind = 'checkout_completed' then
        if v_checkout_session_id !~ '^cs_(test|live)_[A-Za-z0-9]+$'
           or v_customer_id !~ '^cus_[A-Za-z0-9]+$'
           or v_subscription_id !~ '^sub_[A-Za-z0-9]+$' then
          raise exception 'invalid completed Checkout identifiers';
        end if;

        update public.profiles
        set stripe_customer_id = v_customer_id
        where id = v_owner_user_id
          and (stripe_customer_id is null or stripe_customer_id = v_customer_id);
        if not found then
          raise exception 'Stripe customer mapping conflict';
        end if;

        update public.payments
        set stripe_checkout_session_id = v_checkout_session_id,
            stripe_customer_id = v_customer_id,
            stripe_subscription_id = v_subscription_id
        where id = v_payment_id
          and (stripe_checkout_session_id is null or stripe_checkout_session_id = v_checkout_session_id);
        if not found then
          raise exception 'Stripe Checkout session mapping conflict';
        end if;

        insert into public.subscriptions (
          owner_user_id,
          payment_id,
          stripe_subscription_id,
          status,
          product_key,
          stripe_customer_id,
          stripe_price_id,
          credits_per_period,
          stripe_state_updated_at
        ) values (
          v_owner_user_id,
          v_payment_id,
          v_subscription_id,
          'pending',
          v_product_key,
          v_customer_id,
          v_price_id,
          v_credits,
          null
        ) on conflict (stripe_subscription_id) do update
          set payment_id = coalesce(public.subscriptions.payment_id, excluded.payment_id),
              product_key = coalesce(public.subscriptions.product_key, excluded.product_key),
              stripe_customer_id = coalesce(public.subscriptions.stripe_customer_id, excluded.stripe_customer_id),
              stripe_price_id = coalesce(public.subscriptions.stripe_price_id, excluded.stripe_price_id),
              credits_per_period = coalesce(public.subscriptions.credits_per_period, excluded.credits_per_period);
      else
        update public.payments
        set status = 'canceled',
            stripe_checkout_session_id = coalesce(stripe_checkout_session_id, v_checkout_session_id),
            stripe_state_updated_at = p_event_created_at
        where id = v_payment_id
          and status = 'pending'
          and (stripe_state_updated_at is null or stripe_state_updated_at <= p_event_created_at);
      end if;

      update public.stripe_events
      set processed_at = timezone('utc', now()), processing_error = null
      where id = v_event.id;
      return query select false, true, v_payment_id, 0::bigint, null::text;
      return;
    end if;

    if v_owner_user_id is null
       or v_product_key is null
       or v_product_key not in ('subscription', 'recurring_credit_pack')
       or v_customer_id is null
       or v_customer_id !~ '^cus_[A-Za-z0-9]+$'
       or v_subscription_id is null
       or v_subscription_id !~ '^sub_[A-Za-z0-9]+$'
       or v_price_id is null
       or v_price_id !~ '^price_[A-Za-z0-9]+$'
       or v_credits is null
       or v_credits <= 0 then
      raise exception 'invalid Stripe subscription metadata';
    end if;

    if v_kind in ('subscription_created', 'subscription_updated', 'subscription_deleted') then
      insert into public.subscriptions (
        owner_user_id,
        payment_id,
        stripe_subscription_id,
        status,
        current_period_end,
        product_key,
        stripe_customer_id,
        stripe_price_id,
        credits_per_period,
        stripe_state_updated_at
      ) values (
        v_owner_user_id,
        v_payment_id,
        v_subscription_id,
        v_subscription_status,
        v_period_end,
        v_product_key,
        v_customer_id,
        v_price_id,
        v_credits,
        p_event_created_at
      ) on conflict (stripe_subscription_id) do update
        set status = excluded.status,
            current_period_end = excluded.current_period_end,
            product_key = excluded.product_key,
            stripe_customer_id = excluded.stripe_customer_id,
            stripe_price_id = excluded.stripe_price_id,
            credits_per_period = excluded.credits_per_period,
            stripe_state_updated_at = excluded.stripe_state_updated_at
        where public.subscriptions.stripe_state_updated_at is null
           or public.subscriptions.stripe_state_updated_at <= excluded.stripe_state_updated_at;

      update public.stripe_events
      set processed_at = timezone('utc', now()), processing_error = null
      where id = v_event.id;
      return query select false, true, v_payment_id, 0::bigint, null::text;
      return;
    end if;

    if v_invoice_id !~ '^in_[A-Za-z0-9]+$' then
      raise exception 'invalid Stripe invoice identifier';
    end if;

    select * into v_existing_payment
    from public.payments
    where id = v_payment_id and owner_user_id = v_owner_user_id
    for update;
    v_has_initial_payment := found;

    if v_has_initial_payment and (
      v_existing_payment.product_key <> v_product_key
      or v_existing_payment.stripe_price_id <> v_price_id
      or v_existing_payment.credits_per_period <> v_credits
    ) then
      raise exception 'Stripe invoice metadata does not match payment command';
    end if;

    select id into v_grant_payment_id
    from public.payments
    where stripe_invoice_id = v_invoice_id
    for update;
    v_has_invoice_payment := found;

    if not v_has_invoice_payment
       and v_has_initial_payment
       and v_existing_payment.stripe_invoice_id is null then
      v_grant_payment_id := v_existing_payment.id;
      update public.payments
      set stripe_customer_id = v_customer_id,
          stripe_subscription_id = v_subscription_id,
          stripe_invoice_id = v_invoice_id
      where id = v_grant_payment_id;
    elsif not v_has_invoice_payment then
      insert into public.payments (
        owner_user_id,
        stripe_customer_id,
        stripe_subscription_id,
        stripe_invoice_id,
        stripe_price_id,
        product_key,
        credits_per_period,
        status
      ) values (
        v_owner_user_id,
        v_customer_id,
        v_subscription_id,
        v_invoice_id,
        v_price_id,
        v_product_key,
        v_credits,
        'pending'
      ) returning id into v_grant_payment_id;
    end if;

    if v_kind = 'invoice_failed' then
      update public.payments
      set status = 'failed', stripe_state_updated_at = p_event_created_at
      where id = v_grant_payment_id
        and (stripe_state_updated_at is null or stripe_state_updated_at <= p_event_created_at);

      insert into public.subscriptions (
        owner_user_id, payment_id, stripe_subscription_id, status,
        current_period_end, product_key, stripe_customer_id, stripe_price_id,
        credits_per_period, stripe_state_updated_at
      ) values (
        v_owner_user_id, v_payment_id, v_subscription_id, 'past_due',
        v_period_end, v_product_key, v_customer_id, v_price_id,
        v_credits, p_event_created_at
      ) on conflict (stripe_subscription_id) do update
        set status = 'past_due',
            current_period_end = excluded.current_period_end,
            stripe_state_updated_at = excluded.stripe_state_updated_at
        where public.subscriptions.stripe_state_updated_at is null
           or public.subscriptions.stripe_state_updated_at <= excluded.stripe_state_updated_at;

      update public.stripe_events
      set processed_at = timezone('utc', now()), processing_error = null
      where id = v_event.id;
      return query select false, true, v_grant_payment_id, 0::bigint, null::text;
      return;
    end if;

    perform 1 from public.credit_accounts
    where owner_user_id = v_owner_user_id for update;
    if not found then
      raise exception 'credit account not found';
    end if;

    update public.payments
    set status = 'paid', stripe_state_updated_at = p_event_created_at
    where id = v_grant_payment_id
      and (stripe_state_updated_at is null or stripe_state_updated_at <= p_event_created_at);

    insert into public.subscriptions (
      owner_user_id, payment_id, stripe_subscription_id, status,
      current_period_end, product_key, stripe_customer_id, stripe_price_id,
      credits_per_period, stripe_state_updated_at
    ) values (
      v_owner_user_id, v_payment_id, v_subscription_id, 'active',
      v_period_end, v_product_key, v_customer_id, v_price_id,
      v_credits, p_event_created_at
    ) on conflict (stripe_subscription_id) do update
      set status = 'active',
          current_period_end = excluded.current_period_end,
          product_key = excluded.product_key,
          stripe_customer_id = excluded.stripe_customer_id,
          stripe_price_id = excluded.stripe_price_id,
          credits_per_period = excluded.credits_per_period,
          stripe_state_updated_at = excluded.stripe_state_updated_at
      where public.subscriptions.stripe_state_updated_at is null
         or public.subscriptions.stripe_state_updated_at <= excluded.stripe_state_updated_at;

    v_source := case v_product_key
      when 'subscription' then 'subscription'
      else 'recurring_credit_pack'
    end;

    insert into public.credit_lots (
      owner_user_id,
      payment_id,
      source,
      granted_credits,
      remaining_credits,
      stripe_invoice_id
    ) values (
      v_owner_user_id,
      v_grant_payment_id,
      v_source,
      v_credits,
      v_credits,
      v_invoice_id
    ) on conflict (stripe_invoice_id) where stripe_invoice_id is not null
      do nothing;

    if found then
      update public.credit_accounts
      set available_credits = available_credits + v_credits
      where owner_user_id = v_owner_user_id;

      insert into public.ledger_entries (
        owner_user_id,
        entry_kind,
        amount_credits,
        reason,
        payment_id
      ) values (
        v_owner_user_id,
        'credit',
        v_credits,
        case v_product_key
          when 'subscription' then 'stripe.subscription.invoice_paid'
          else 'stripe.recurring_credit_pack.invoice_paid'
        end,
        v_grant_payment_id
      ) on conflict (payment_id, reason) where public.ledger_entries.payment_id is not null
        do nothing;

      insert into public.outbox_events (
        aggregate_type, aggregate_id, event_type, payload
      ) values (
        'payment',
        v_grant_payment_id,
        'stripe.credits_granted',
        jsonb_build_object(
          'stripe_invoice_id', v_invoice_id,
          'credits', v_credits,
          'product_key', v_product_key
        )
      ) on conflict (aggregate_type, aggregate_id, event_type) do nothing;
    else
      v_credits := 0;
    end if;

    update public.stripe_events
    set processed_at = timezone('utc', now()), processing_error = null
    where id = v_event.id;
    return query select false, true, v_grant_payment_id, v_credits, null::text;
    return;
  exception when others then
    v_error := sqlstate || ':' || left(sqlerrm, 220);
    update public.stripe_events
    set processing_error = v_error
    where id = v_event.id;
    return query select false, false, null::uuid, 0::bigint, v_error;
    return;
  end;
end;
$$;

revoke all on function public.create_stripe_checkout_command(uuid, text, text, bigint) from public;
revoke all on function public.attach_stripe_customer(uuid, text) from public;
revoke all on function public.attach_stripe_checkout_session(uuid, text, text) from public;
revoke all on function public.process_stripe_event(text, text, timestamptz, jsonb, jsonb) from public;

grant execute on function public.create_stripe_checkout_command(uuid, text, text, bigint) to authenticated;
grant execute on function public.attach_stripe_customer(uuid, text) to service_role;
grant execute on function public.attach_stripe_checkout_session(uuid, text, text) to service_role;
grant execute on function public.process_stripe_event(text, text, timestamptz, jsonb, jsonb) to service_role;

commit;
