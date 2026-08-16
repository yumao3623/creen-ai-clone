import type Stripe from "stripe";

import {
  isStripeProductKey,
  type StripeProductKey,
} from "@/integrations/stripe/config";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const allowedEventTypes = [
  "checkout.session.completed",
  "checkout.session.expired",
  "invoice.paid",
  "invoice.payment_failed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
] as const;

type AllowedStripeEventType = (typeof allowedEventTypes)[number];

type CommonMetadata = Readonly<{
  ownerUserId: string;
  paymentId: string;
  productKey: StripeProductKey;
  priceId: string;
  creditsPerPeriod: number;
}>;

export type NormalizedStripeEvent = Readonly<
  CommonMetadata & {
    kind:
      | "checkout_completed"
      | "checkout_expired"
      | "invoice_paid"
      | "invoice_failed"
      | "subscription_created"
      | "subscription_updated"
      | "subscription_deleted";
    checkoutSessionId?: string;
    customerId?: string;
    subscriptionId?: string;
    invoiceId?: string;
    subscriptionStatus?: string;
    periodEnd?: string | undefined;
  }
>;

export class StripeWebhookError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StripeWebhookError";
  }
}

function objectId(value: unknown, prefix: string) {
  const id =
    typeof value === "string"
      ? value
      : value && typeof value === "object" && "id" in value
        ? value.id
        : null;
  return typeof id === "string" && id.startsWith(prefix) ? id : null;
}

function metadataValue(
  metadata: Stripe.Metadata | null | undefined,
  name: string,
) {
  const value = metadata?.[name]?.trim();
  return value || null;
}

function commonMetadata(
  metadata: Stripe.Metadata | null | undefined,
): CommonMetadata | null {
  const ownerUserId = metadataValue(metadata, "owner_user_id");
  const paymentId = metadataValue(metadata, "payment_id");
  const productKey = metadataValue(metadata, "product_key");
  const priceId = metadataValue(metadata, "price_id");
  const credits = Number(metadataValue(metadata, "credits_per_period"));

  if (
    !ownerUserId ||
    !uuidPattern.test(ownerUserId) ||
    !paymentId ||
    !uuidPattern.test(paymentId) ||
    !isStripeProductKey(productKey) ||
    !priceId?.startsWith("price_") ||
    !Number.isSafeInteger(credits) ||
    credits <= 0
  ) {
    return null;
  }

  return {
    ownerUserId,
    paymentId,
    productKey,
    priceId,
    creditsPerPeriod: credits,
  };
}

function periodEndIso(unixSeconds: number | null | undefined) {
  return typeof unixSeconds === "number"
    ? new Date(unixSeconds * 1000).toISOString()
    : undefined;
}

function subscriptionPeriodEnd(subscription: Stripe.Subscription) {
  const itemPeriodEnds = subscription.items.data.map(
    (item) => item.current_period_end,
  );
  return itemPeriodEnds.length > 0
    ? periodEndIso(Math.max(...itemPeriodEnds))
    : undefined;
}

export function isAllowedStripeEventType(
  value: string,
): value is AllowedStripeEventType {
  return allowedEventTypes.includes(value as AllowedStripeEventType);
}

export function normalizeStripeEvent(
  event: Stripe.Event,
): NormalizedStripeEvent | null {
  if (event.livemode || !isAllowedStripeEventType(event.type)) {
    return null;
  }

  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.expired"
  ) {
    const session = event.data.object;
    const common = commonMetadata(session.metadata);
    if (!common) {
      return null;
    }

    const base = {
      ...common,
      checkoutSessionId: session.id,
    };
    if (event.type === "checkout.session.expired") {
      return { ...base, kind: "checkout_expired" };
    }

    const customerId = objectId(session.customer, "cus_");
    const subscriptionId = objectId(session.subscription, "sub_");
    if (!customerId || !subscriptionId || session.mode !== "subscription") {
      throw new StripeWebhookError(
        "Completed Checkout is missing subscription identifiers.",
      );
    }
    return {
      ...base,
      kind: "checkout_completed",
      customerId,
      subscriptionId,
    };
  }

  if (
    event.type === "invoice.paid" ||
    event.type === "invoice.payment_failed"
  ) {
    const invoice = event.data.object;
    const details = invoice.parent?.subscription_details;
    const common = commonMetadata(details?.metadata);
    const customerId = objectId(invoice.customer, "cus_");
    const subscriptionId = objectId(details?.subscription, "sub_");
    if (!common || !customerId || !subscriptionId) {
      return null;
    }

    return {
      ...common,
      kind: event.type === "invoice.paid" ? "invoice_paid" : "invoice_failed",
      customerId,
      subscriptionId,
      invoiceId: invoice.id,
      ...(periodEndIso(invoice.period_end)
        ? { periodEnd: periodEndIso(invoice.period_end) }
        : {}),
    };
  }

  const subscription = event.data.object as Stripe.Subscription;
  const common = commonMetadata(subscription.metadata);
  const customerId = objectId(subscription.customer, "cus_");
  const priceId = subscription.items.data[0]?.price.id;
  if (!common || !customerId || priceId !== common.priceId) {
    return null;
  }

  const kind =
    event.type === "customer.subscription.created"
      ? "subscription_created"
      : event.type === "customer.subscription.updated"
        ? "subscription_updated"
        : "subscription_deleted";

  return {
    ...common,
    kind,
    customerId,
    subscriptionId: subscription.id,
    subscriptionStatus:
      kind === "subscription_deleted" ? "canceled" : subscription.status,
    ...(subscriptionPeriodEnd(subscription)
      ? { periodEnd: subscriptionPeriodEnd(subscription) }
      : {}),
  };
}

export function stripeMetadata(input: CommonMetadata): Stripe.MetadataParam {
  return {
    owner_user_id: input.ownerUserId,
    payment_id: input.paymentId,
    product_key: input.productKey,
    price_id: input.priceId,
    credits_per_period: String(input.creditsPerPeriod),
  };
}
