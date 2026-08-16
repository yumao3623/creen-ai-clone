import "server-only";

export const stripeProductKeys = [
  "subscription",
  "recurring_credit_pack",
] as const;

export type StripeProductKey = (typeof stripeProductKeys)[number];

export type StripeProductDefinition = Readonly<{
  key: StripeProductKey;
  label: string;
  priceId: string;
  creditSource: "subscription" | "recurring_credit_pack";
}>;

export type StripeServerConfig = Readonly<{
  secretKey: string;
  webhookSecret: string;
  siteUrl: string;
  products: Readonly<Record<StripeProductKey, StripeProductDefinition>>;
}>;

function required(environment: NodeJS.ProcessEnv, name: string) {
  const value = environment[name]?.trim();
  if (!value) {
    throw new Error(`${name} must be configured for Stripe Sandbox.`);
  }
  return value;
}

function stripePriceId(environment: NodeJS.ProcessEnv, name: string) {
  const value = required(environment, name);
  if (!/^price_[A-Za-z0-9]+$/.test(value)) {
    throw new Error(`${name} must be a Stripe Price ID.`);
  }
  return value;
}

function siteUrl(environment: NodeJS.ProcessEnv) {
  const url = new URL(required(environment, "NEXT_PUBLIC_SITE_URL"));
  const localHttp =
    url.protocol === "http:" &&
    (url.hostname === "localhost" || url.hostname === "127.0.0.1");

  if (url.protocol !== "https:" && !localHttp) {
    throw new Error(
      "NEXT_PUBLIC_SITE_URL must use HTTPS outside local development.",
    );
  }

  return url.toString().replace(/\/$/, "");
}

export function isStripeProductKey(value: unknown): value is StripeProductKey {
  return (
    typeof value === "string" &&
    stripeProductKeys.includes(value as StripeProductKey)
  );
}

export function getStripeServerConfig(
  environment: NodeJS.ProcessEnv = process.env,
): StripeServerConfig {
  const secretKey = required(environment, "STRIPE_SECRET_KEY");
  if (!/^(sk|rk)_test_[A-Za-z0-9]+$/.test(secretKey)) {
    throw new Error("STRIPE_SECRET_KEY must be a Stripe test-mode secret key.");
  }

  const webhookSecret = required(environment, "STRIPE_WEBHOOK_SECRET");
  if (!/^whsec_[A-Za-z0-9]+$/.test(webhookSecret)) {
    throw new Error("STRIPE_WEBHOOK_SECRET must be a Stripe webhook secret.");
  }

  const subscriptionPriceId = stripePriceId(
    environment,
    "STRIPE_SUBSCRIPTION_PRICE_ID",
  );
  const recurringPackPriceId = stripePriceId(
    environment,
    "STRIPE_RECURRING_CREDIT_PACK_PRICE_ID",
  );
  if (subscriptionPriceId === recurringPackPriceId) {
    throw new Error(
      "Stripe subscription and credit pack Price IDs must differ.",
    );
  }

  return {
    secretKey,
    webhookSecret,
    siteUrl: siteUrl(environment),
    products: {
      subscription: {
        key: "subscription",
        label: "Subscription",
        priceId: subscriptionPriceId,
        creditSource: "subscription",
      },
      recurring_credit_pack: {
        key: "recurring_credit_pack",
        label: "Recurring Credit Pack",
        priceId: recurringPackPriceId,
        creditSource: "recurring_credit_pack",
      },
    },
  };
}
