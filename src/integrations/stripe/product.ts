import type Stripe from "stripe";

import type { StripeProductDefinition } from "@/integrations/stripe/config";

export type ValidatedStripePrice = Readonly<{
  priceId: string;
  creditsPerPeriod: number;
}>;

export class StripeProductError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StripeProductError";
  }
}

export function validateStripePrice(
  price: Stripe.Price,
  product: StripeProductDefinition,
): ValidatedStripePrice {
  if (price.id !== product.priceId || !price.active || !price.recurring) {
    throw new StripeProductError(
      "Stripe Price is not an active recurring allow-list item.",
    );
  }
  if (price.livemode || price.currency !== "usd") {
    throw new StripeProductError("Stripe Price must be a USD test-mode Price.");
  }

  const credits = Number(price.metadata.credits);
  if (!Number.isSafeInteger(credits) || credits <= 0) {
    throw new StripeProductError(
      "Stripe Price metadata.credits must be a positive safe integer.",
    );
  }

  return { priceId: price.id, creditsPerPeriod: credits };
}
