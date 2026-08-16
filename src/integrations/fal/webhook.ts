import { timingSafeEqual } from "node:crypto";

import type {
  GenerationInput,
  ProviderResultReference,
  ProviderWebhookEvent,
} from "@/domain/generation/modality-contract";
import { toProviderSubmission } from "@/domain/generation/modality-contract";
import { FalAdapterError, mapFalResult } from "@/integrations/fal/adapter";

export class FalWebhookError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FalWebhookError";
  }
}

export type FalWebhookEnvelope = Readonly<{
  externalTaskId: string;
  status: "OK" | "ERROR";
  payload: unknown;
}>;

export function isValidWebhookToken(
  candidate: string | null,
  expected: string,
): boolean {
  if (!candidate || candidate.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(Buffer.from(candidate), Buffer.from(expected));
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function parseFalWebhookEnvelope(payload: unknown): FalWebhookEnvelope {
  const event = asRecord(payload);
  if (!event || typeof event.request_id !== "string") {
    throw new FalWebhookError("fal webhook payload is invalid.");
  }

  if (event.status !== "OK" && event.status !== "ERROR") {
    throw new FalWebhookError("fal webhook status is not terminal.");
  }

  return {
    externalTaskId: event.request_id,
    status: event.status,
    payload: event.payload,
  };
}

export function parseFalWebhook(
  input: GenerationInput,
  payload: unknown,
): ProviderWebhookEvent {
  const event = parseFalWebhookEnvelope(payload);
  if (event.status === "ERROR") {
    return {
      externalTaskId: event.externalTaskId,
      status: "failed",
      failureCode: "provider_failed",
      raw: JSON.parse(JSON.stringify(payload)),
    };
  }

  try {
    const result = mapFalResult(
      toProviderSubmission(input),
      event.externalTaskId,
      event.payload,
    );
    return {
      externalTaskId: event.externalTaskId,
      status: "succeeded",
      result,
      raw: JSON.parse(JSON.stringify(payload)),
    };
  } catch (error) {
    if (error instanceof FalAdapterError) {
      throw new FalWebhookError(error.message);
    }
    throw error;
  }
}

export function webhookResultReference(
  event: ProviderWebhookEvent,
): ProviderResultReference | undefined {
  return event.status === "succeeded" ? event.result : undefined;
}
