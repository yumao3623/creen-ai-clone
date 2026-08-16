import { describe, expect, it } from "vitest";

import { getStripeServerConfig } from "@/integrations/stripe/config";

const configuredEnvironment = {
  STRIPE_SECRET_KEY: "sk_test_123456789",
  STRIPE_WEBHOOK_SECRET: "whsec_123456789",
  STRIPE_SUBSCRIPTION_PRICE_ID: "price_subscription123",
  STRIPE_RECURRING_CREDIT_PACK_PRICE_ID: "price_pack123",
  NEXT_PUBLIC_SITE_URL: "https://app.example.com/",
} as unknown as NodeJS.ProcessEnv;

describe("Stripe server configuration", () => {
  it("requires two distinct test-mode Price allow-list entries", () => {
    expect(getStripeServerConfig(configuredEnvironment)).toMatchObject({
      siteUrl: "https://app.example.com",
      products: {
        subscription: { priceId: "price_subscription123" },
        recurring_credit_pack: { priceId: "price_pack123" },
      },
    });

    expect(() =>
      getStripeServerConfig({
        ...configuredEnvironment,
        STRIPE_RECURRING_CREDIT_PACK_PRICE_ID: "price_subscription123",
      }),
    ).toThrow("must differ");
  });

  it("rejects live-mode keys and insecure hosted return URLs", () => {
    expect(() =>
      getStripeServerConfig({
        ...configuredEnvironment,
        STRIPE_SECRET_KEY: "sk_live_123456789",
      }),
    ).toThrow("test-mode");
    expect(() =>
      getStripeServerConfig({
        ...configuredEnvironment,
        NEXT_PUBLIC_SITE_URL: "http://app.example.com",
      }),
    ).toThrow("HTTPS");
  });
});
