import { describe, expect, it } from "vitest";

import { validateStripePrice } from "@/integrations/stripe/product";

const product = {
  key: "subscription" as const,
  label: "Subscription",
  priceId: "price_subscription123",
  creditSource: "subscription" as const,
};

function price(overrides: Record<string, unknown> = {}) {
  return {
    id: product.priceId,
    active: true,
    recurring: { interval: "month" },
    livemode: false,
    currency: "usd",
    metadata: { credits: "1000" },
    ...overrides,
  } as never;
}

describe("Stripe Price allow-list validation", () => {
  it("uses the positive integer credits metadata from the server-retrieved Price", () => {
    expect(validateStripePrice(price(), product)).toEqual({
      priceId: "price_subscription123",
      creditsPerPeriod: 1000,
    });
  });

  it("rejects non-recurring, live, or unmetered Price records", () => {
    expect(() =>
      validateStripePrice(price({ recurring: null }), product),
    ).toThrow("recurring");
    expect(() =>
      validateStripePrice(price({ livemode: true }), product),
    ).toThrow("test-mode");
    expect(() =>
      validateStripePrice(price({ metadata: { credits: "0" } }), product),
    ).toThrow("positive");
  });
});
