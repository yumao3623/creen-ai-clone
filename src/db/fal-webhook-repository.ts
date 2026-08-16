import "server-only";

import type { GenerationInput } from "@/domain/generation/modality-contract";
import type { JsonValue } from "@/domain/generation/request";
import type { GenerationStatus } from "@/domain/generation/state";

type FalWebhookContextArgs = Readonly<{
  p_external_task_id: string;
}>;

type FalWebhookFinalizeArgs = Readonly<{
  p_external_task_id: string;
  p_payload_hash: string;
  p_payload: Record<string, unknown>;
  p_succeeded: boolean;
  p_result_reference: JsonValue | null;
  p_failure_code: string | null;
}>;

export type FalWebhookRpcClient = Readonly<{
  rpc: (
    name: "get_fal_webhook_context" | "finalize_fal_webhook_event",
    args: FalWebhookContextArgs | FalWebhookFinalizeArgs,
  ) => PromiseLike<
    Readonly<{ data: unknown; error: Readonly<{ message: string }> | null }>
  >;
}>;

export type FalWebhookContext = Readonly<{
  taskId: string;
  normalizedInput: GenerationInput;
  taskStatus: GenerationStatus;
}>;

export type FalWebhookRecordResult = Readonly<{
  taskId: string;
  wasReplayed: boolean;
  taskStatus: GenerationStatus;
}>;

export class FalWebhookRepositoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FalWebhookRepositoryError";
  }
}

function isStatus(value: unknown): value is GenerationStatus {
  return (
    typeof value === "string" &&
    [
      "draft",
      "quoted",
      "reserving",
      "queued",
      "processing",
      "succeeded",
      "failed",
      "canceled",
      "expired",
      "reconciliation_required",
    ].includes(value)
  );
}

function firstRow(data: unknown): unknown {
  return Array.isArray(data) ? data[0] : data;
}

function isContextRow(value: unknown): value is Readonly<{
  task_id: string;
  normalized_input: GenerationInput;
  task_status: GenerationStatus;
}> {
  if (!value || typeof value !== "object") {
    return false;
  }
  const row = value as Record<string, unknown>;
  return (
    typeof row.task_id === "string" &&
    !!row.normalized_input &&
    typeof row.normalized_input === "object" &&
    isStatus(row.task_status)
  );
}

function isFinalizeRow(value: unknown): value is Readonly<{
  task_id: string;
  was_replayed: boolean;
  task_status: GenerationStatus;
}> {
  if (!value || typeof value !== "object") {
    return false;
  }
  const row = value as Record<string, unknown>;
  return (
    typeof row.task_id === "string" &&
    typeof row.was_replayed === "boolean" &&
    isStatus(row.task_status)
  );
}

export class SupabaseFalWebhookRepository {
  constructor(private readonly client: FalWebhookRpcClient) {}

  async getContext(externalTaskId: string): Promise<FalWebhookContext> {
    const { data, error } = await this.client.rpc("get_fal_webhook_context", {
      p_external_task_id: externalTaskId,
    });

    const row = firstRow(data);
    if (error || !isContextRow(row)) {
      throw new FalWebhookRepositoryError(
        "Unable to load the fal webhook context.",
      );
    }

    return {
      taskId: row.task_id,
      normalizedInput: row.normalized_input,
      taskStatus: row.task_status,
    };
  }

  async finalize(
    input: Readonly<{
      externalTaskId: string;
      payloadHash: string;
      payload: Record<string, unknown>;
      succeeded: boolean;
      resultReference?: JsonValue;
      failureCode?: string;
    }>,
  ): Promise<FalWebhookRecordResult> {
    const { data, error } = await this.client.rpc(
      "finalize_fal_webhook_event",
      {
        p_external_task_id: input.externalTaskId,
        p_payload_hash: input.payloadHash,
        p_payload: input.payload,
        p_succeeded: input.succeeded,
        p_result_reference: input.resultReference ?? null,
        p_failure_code: input.failureCode ?? null,
      },
    );

    const row = firstRow(data);
    if (error || !isFinalizeRow(row)) {
      throw new FalWebhookRepositoryError(
        "Unable to finalize the fal webhook event.",
      );
    }

    return {
      taskId: row.task_id,
      wasReplayed: row.was_replayed,
      taskStatus: row.task_status,
    };
  }
}
