import { NextResponse } from "next/server";

import { SupabaseStripeRepository } from "@/db/stripe-repository";
import { createStripeClient } from "@/integrations/stripe/client";
import { getStripeServerConfig } from "@/integrations/stripe/config";
import { normalizeStripeEvent } from "@/integrations/stripe/webhook";
import { createSupabaseAdminClient } from "@/integrations/supabase/admin";

function webhookError(code: string, status: number) {
  return NextResponse.json({ error: { code } }, { status });
}

export async function POST(request: Request) {
  let config;
  let stripe;
  try {
    config = getStripeServerConfig();
    stripe = createStripeClient();
  } catch {
    return webhookError("stripe_unavailable", 503);
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) return webhookError("invalid_stripe_signature", 400);

  const rawPayload = await request.text();
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      rawPayload,
      signature,
      config.webhookSecret,
    );
  } catch {
    return webhookError("invalid_stripe_signature", 400);
  }

  const normalized = normalizeStripeEvent(event);
  if (!normalized) {
    return NextResponse.json({ accepted: true, ignored: true });
  }

  const admin = createSupabaseAdminClient();
  if (!admin) return webhookError("stripe_lifecycle_unavailable", 503);

  try {
    const result = await new SupabaseStripeRepository(admin).processEvent({
      eventId: event.id,
      eventType: event.type,
      eventCreatedAt: new Date(event.created * 1000).toISOString(),
      payload: JSON.parse(rawPayload) as Record<string, unknown>,
      normalized,
    });
    if (!result.processed)
      return webhookError("stripe_event_retry_required", 503);

    return NextResponse.json({
      accepted: true,
      replayed: result.wasReplayed,
      creditsGranted: result.creditsGranted,
    });
  } catch {
    return webhookError("stripe_event_processing_failed", 503);
  }
}
