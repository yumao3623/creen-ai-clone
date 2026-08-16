import { describe, expect, it } from "vitest";

import { SupabaseStripeRepository } from "@/db/stripe-repository";

describe("Stripe repository", () => {
  it("maps the Checkout command RPC response without trusting client amounts", async () => {
    const client = {
      rpc: async (name: string, args: Record<string, unknown>) => {
        expect(name).toBe("create_stripe_checkout_command");
        expect(args).toMatchObject({
          p_product_key: "subscription",
          p_credits_per_period: 1000,
        });
        return {
          data: {
            payment_id: "0aa451fb-dc7d-4e9f-962a-32743414a8b9",
            stripe_checkout_session_id: null,
            was_replayed: false,
          },
          error: null,
        };
      },
    };

    await expect(
      new SupabaseStripeRepository(client).createCheckoutCommand({
        clientKey: "0aa451fb-dc7d-4e9f-962a-32743414a8b9",
        productKey: "subscription",
        priceId: "price_subscription123",
        creditsPerPeriod: 1000,
      }),
    ).resolves.toMatchObject({ wasReplayed: false });
  });

  it("rejects malformed webhook RPC responses", async () => {
    const repository = new SupabaseStripeRepository({
      rpc: async () => ({ data: { processed: "yes" }, error: null }),
    });

    await expect(
      repository.processEvent({
        eventId: "evt_123456789",
        eventType: "invoice.paid",
        eventCreatedAt: "2026-08-16T00:00:00.000Z",
        payload: {},
        normalized: {
          kind: "invoice_paid",
          ownerUserId: "b614fc99-6caf-4d51-ac90-4129ceae79f4",
          paymentId: "0aa451fb-dc7d-4e9f-962a-32743414a8b9",
          productKey: "subscription",
          priceId: "price_subscription123",
          creditsPerPeriod: 1000,
        },
      }),
    ).rejects.toThrow("Unable to process Stripe webhook event");
  });
});
