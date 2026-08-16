import type Stripe from "stripe";
import { describe, expect, it } from "vitest";

import {
  normalizeStripeEvent,
  stripeMetadata,
} from "@/integrations/stripe/webhook";

const metadata = {
  owner_user_id: "b614fc99-6caf-4d51-ac90-4129ceae79f4",
  payment_id: "0aa451fb-dc7d-4e9f-962a-32743414a8b9",
  product_key: "subscription",
  price_id: "price_subscription123",
  credits_per_period: "1000",
};

function event(type: string, object: Record<string, unknown>) {
  return {
    id: "evt_123456789",
    type,
    created: 1_723_840_000,
    livemode: false,
    data: { object },
  } as unknown as Stripe.Event;
}

describe("Stripe webhook normalization", () => {
  it("normalizes invoice.paid using the immutable subscription metadata snapshot", () => {
    expect(
      normalizeStripeEvent(
        event("invoice.paid", {
          id: "in_123456789",
          customer: "cus_123456789",
          period_end: 1_723_840_000,
          parent: {
            subscription_details: {
              metadata,
              subscription: "sub_123456789",
            },
          },
        }),
      ),
    ).toMatchObject({
      kind: "invoice_paid",
      ownerUserId: metadata.owner_user_id,
      paymentId: metadata.payment_id,
      invoiceId: "in_123456789",
      subscriptionId: "sub_123456789",
      creditsPerPeriod: 1000,
    });
  });

  it("does not treat browser-facing Checkout completion as a credit grant", () => {
    expect(
      normalizeStripeEvent(
        event("checkout.session.completed", {
          id: "cs_test_123456789",
          customer: "cus_123456789",
          subscription: "sub_123456789",
          mode: "subscription",
          metadata,
        }),
      ),
    ).toMatchObject({ kind: "checkout_completed", creditsPerPeriod: 1000 });
  });

  it("ignores live-mode and uncorrelated events", () => {
    const live = event("invoice.paid", {});
    (live as { livemode: boolean }).livemode = true;
    expect(normalizeStripeEvent(live)).toBeNull();
    expect(
      normalizeStripeEvent(event("invoice.paid", { id: "in_123" })),
    ).toBeNull();
  });

  it("writes only server-owned linkage metadata to Stripe", () => {
    expect(
      stripeMetadata({
        ownerUserId: metadata.owner_user_id,
        paymentId: metadata.payment_id,
        productKey: "subscription",
        priceId: metadata.price_id,
        creditsPerPeriod: 1000,
      }),
    ).toEqual(metadata);
  });
});
