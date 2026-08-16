import { NextResponse } from "next/server";

import { SupabaseStripeRepository } from "@/db/stripe-repository";
import {
  isStripeProductKey,
  getStripeServerConfig,
} from "@/integrations/stripe/config";
import { createStripeClient } from "@/integrations/stripe/client";
import { validateStripePrice } from "@/integrations/stripe/product";
import { stripeMetadata } from "@/integrations/stripe/webhook";
import { createSupabaseAdminClient } from "@/integrations/supabase/admin";
import { createSupabaseServerClient } from "@/integrations/supabase/server";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function checkoutError(code: string, status: number) {
  return NextResponse.json({ error: { code } }, { status });
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return checkoutError("auth_unavailable", 503);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return checkoutError("authentication_required", 401);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return checkoutError("invalid_checkout_request", 400);
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return checkoutError("invalid_checkout_request", 400);
  }

  const productKey = (body as Record<string, unknown>).productKey;
  const clientKey = (body as Record<string, unknown>).clientKey;
  if (
    !isStripeProductKey(productKey) ||
    typeof clientKey !== "string" ||
    !uuidPattern.test(clientKey)
  ) {
    return checkoutError("invalid_checkout_request", 400);
  }

  const admin = createSupabaseAdminClient();
  if (!admin) return checkoutError("checkout_unavailable", 503);

  let config;
  let stripe;
  try {
    config = getStripeServerConfig();
    stripe = createStripeClient();
  } catch {
    return checkoutError("checkout_unavailable", 503);
  }

  const product = config.products[productKey];
  let validatedPrice;
  try {
    validatedPrice = validateStripePrice(
      await stripe.prices.retrieve(product.priceId),
      product,
    );
  } catch {
    return checkoutError("checkout_product_unavailable", 503);
  }

  const userRepository = new SupabaseStripeRepository(supabase);
  let command;
  try {
    command = await userRepository.createCheckoutCommand({
      clientKey,
      productKey,
      priceId: validatedPrice.priceId,
      creditsPerPeriod: validatedPrice.creditsPerPeriod,
    });
  } catch {
    return checkoutError("checkout_command_failed", 409);
  }

  const adminRepository = new SupabaseStripeRepository(admin);
  try {
    if (command.checkoutSessionId) {
      const existing = await stripe.checkout.sessions.retrieve(
        command.checkoutSessionId,
      );
      if (existing.url) return NextResponse.json({ url: existing.url });
    }

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();
    if (profileError) throw profileError;

    const customerId =
      profile.stripe_customer_id ??
      (
        await stripe.customers.create(
          {
            ...(user.email ? { email: user.email } : {}),
            metadata: { owner_user_id: user.id },
          },
          { idempotencyKey: `stripe-customer-${user.id}` },
        )
      ).id;

    await adminRepository.attachCustomer(user.id, customerId);

    const metadata = stripeMetadata({
      ownerUserId: user.id,
      paymentId: command.paymentId,
      productKey,
      priceId: validatedPrice.priceId,
      creditsPerPeriod: validatedPrice.creditsPerPeriod,
    });
    const session = await stripe.checkout.sessions.create(
      {
        mode: "subscription",
        customer: customerId,
        client_reference_id: command.paymentId,
        line_items: [{ price: validatedPrice.priceId, quantity: 1 }],
        metadata,
        subscription_data: { metadata },
        success_url: `${config.siteUrl}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${config.siteUrl}/checkout/return?canceled=1`,
      },
      { idempotencyKey: `stripe-checkout-${command.paymentId}` },
    );
    if (!session.url) throw new Error("Stripe did not return a Checkout URL.");

    await adminRepository.attachCheckoutSession({
      paymentId: command.paymentId,
      customerId,
      checkoutSessionId: session.id,
    });
    return NextResponse.json({ url: session.url });
  } catch {
    // A repeated client key is safe: Stripe's idempotency key returns the same session.
    // The client can retry without creating an additional Checkout command.
    return checkoutError("checkout_session_failed", 503);
  }
}
