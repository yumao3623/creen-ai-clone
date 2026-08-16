import { createHash } from "node:crypto";

import { NextResponse } from "next/server";

import { SupabaseFalWebhookRepository } from "@/db/fal-webhook-repository";
import { getFalServerConfig } from "@/integrations/fal/config";
import {
  isValidWebhookToken,
  parseFalWebhook,
  parseFalWebhookEnvelope,
} from "@/integrations/fal/webhook";
import { parseGenerationInput } from "@/domain/generation/modality-contract";
import { createSupabaseAdminClient } from "@/integrations/supabase/admin";

function webhookError(code: string, status: number) {
  return NextResponse.json({ error: { code } }, { status });
}

export async function POST(request: Request) {
  let config;
  try {
    config = getFalServerConfig();
  } catch {
    return webhookError("generation_unavailable", 503);
  }

  if (
    !isValidWebhookToken(
      new URL(request.url).searchParams.get("token"),
      config.webhookToken,
    )
  ) {
    return webhookError("invalid_webhook_token", 401);
  }

  const rawPayload = await request.text();
  let payload: unknown;
  try {
    payload = JSON.parse(rawPayload);
  } catch {
    return webhookError("invalid_webhook_payload", 400);
  }

  let event;
  try {
    event = parseFalWebhookEnvelope(payload);
  } catch {
    return webhookError("invalid_webhook_payload", 400);
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return webhookError("invalid_webhook_payload", 400);
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return webhookError("generation_lifecycle_unavailable", 503);
  }

  try {
    const repository = new SupabaseFalWebhookRepository(admin);
    const context = await repository.getContext(event.externalTaskId);
    const finalized = parseFalWebhook(
      parseGenerationInput(context.normalizedInput),
      payload,
    );
    const result = await repository.finalize({
      externalTaskId: event.externalTaskId,
      payloadHash: createHash("sha256").update(rawPayload).digest("hex"),
      payload: payload as Record<string, unknown>,
      succeeded: finalized.status === "succeeded",
      ...(finalized.result === undefined
        ? {}
        : { resultReference: finalized.result }),
      ...(finalized.failureCode === undefined
        ? {}
        : { failureCode: finalized.failureCode }),
    });
    return NextResponse.json({
      accepted: true,
      replayed: result.wasReplayed,
      status: result.taskStatus,
    });
  } catch {
    return webhookError("webhook_finalization_failed", 503);
  }
}
