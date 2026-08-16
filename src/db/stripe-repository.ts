import "server-only";

import type { NormalizedStripeEvent } from "@/integrations/stripe/webhook";
import type { StripeProductKey } from "@/integrations/stripe/config";

type RpcResult = PromiseLike<
  Readonly<{ data: unknown; error: Readonly<{ message: string }> | null }>
>;

export type StripeRpcClient = Readonly<{
  rpc: (name: string, args: Record<string, unknown>) => RpcResult;
}>;

export type StripeCheckoutCommand = Readonly<{
  paymentId: string;
  checkoutSessionId: string | null;
  wasReplayed: boolean;
}>;

export type StripeEventResult = Readonly<{
  wasReplayed: boolean;
  processed: boolean;
  paymentId: string | null;
  creditsGranted: number;
  processingError: string | null;
}>;

export class StripeRepositoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StripeRepositoryError";
  }
}

function firstRow(data: unknown) {
  return Array.isArray(data) ? data[0] : data;
}

function checkoutRow(value: unknown): value is Readonly<{
  payment_id: string;
  stripe_checkout_session_id: string | null;
  was_replayed: boolean;
}> {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.payment_id === "string" &&
    (row.stripe_checkout_session_id === null ||
      typeof row.stripe_checkout_session_id === "string") &&
    typeof row.was_replayed === "boolean"
  );
}

function eventRow(value: unknown): value is Readonly<{
  was_replayed: boolean;
  processed: boolean;
  payment_id: string | null;
  credits_granted: number;
  processing_error: string | null;
}> {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.was_replayed === "boolean" &&
    typeof row.processed === "boolean" &&
    (row.payment_id === null || typeof row.payment_id === "string") &&
    typeof row.credits_granted === "number" &&
    Number.isSafeInteger(row.credits_granted) &&
    (row.processing_error === null || typeof row.processing_error === "string")
  );
}

export class SupabaseStripeRepository {
  constructor(private readonly client: StripeRpcClient) {}

  async createCheckoutCommand(
    input: Readonly<{
      clientKey: string;
      productKey: StripeProductKey;
      priceId: string;
      creditsPerPeriod: number;
    }>,
  ): Promise<StripeCheckoutCommand> {
    const { data, error } = await this.client.rpc(
      "create_stripe_checkout_command",
      {
        p_client_key: input.clientKey,
        p_product_key: input.productKey,
        p_stripe_price_id: input.priceId,
        p_credits_per_period: input.creditsPerPeriod,
      },
    );
    const row = firstRow(data);
    if (error || !checkoutRow(row)) {
      throw new StripeRepositoryError(
        "Unable to create Stripe Checkout command.",
      );
    }
    return {
      paymentId: row.payment_id,
      checkoutSessionId: row.stripe_checkout_session_id,
      wasReplayed: row.was_replayed,
    };
  }

  async attachCustomer(ownerUserId: string, customerId: string) {
    const { error } = await this.client.rpc("attach_stripe_customer", {
      p_owner_user_id: ownerUserId,
      p_stripe_customer_id: customerId,
    });
    if (error) {
      throw new StripeRepositoryError("Unable to attach Stripe Customer.");
    }
  }

  async attachCheckoutSession(
    input: Readonly<{
      paymentId: string;
      customerId: string;
      checkoutSessionId: string;
    }>,
  ) {
    const { error } = await this.client.rpc("attach_stripe_checkout_session", {
      p_payment_id: input.paymentId,
      p_stripe_customer_id: input.customerId,
      p_stripe_checkout_session_id: input.checkoutSessionId,
    });
    if (error) {
      throw new StripeRepositoryError(
        "Unable to attach Stripe Checkout Session.",
      );
    }
  }

  async processEvent(
    input: Readonly<{
      eventId: string;
      eventType: string;
      eventCreatedAt: string;
      payload: Record<string, unknown>;
      normalized: NormalizedStripeEvent;
    }>,
  ): Promise<StripeEventResult> {
    const { data, error } = await this.client.rpc("process_stripe_event", {
      p_stripe_event_id: input.eventId,
      p_event_type: input.eventType,
      p_event_created_at: input.eventCreatedAt,
      p_payload: input.payload,
      p_normalized: input.normalized,
    });
    const row = firstRow(data);
    if (error || !eventRow(row)) {
      throw new StripeRepositoryError(
        "Unable to process Stripe webhook event.",
      );
    }
    return {
      wasReplayed: row.was_replayed,
      processed: row.processed,
      paymentId: row.payment_id,
      creditsGranted: row.credits_granted,
      processingError: row.processing_error,
    };
  }
}
