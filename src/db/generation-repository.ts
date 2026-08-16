import "server-only";

import type { JsonValue } from "@/domain/generation/request";
import type { GenerationModality } from "@/domain/generation/state";

type SubmitGenerationTaskRpcArgs = Readonly<{
  p_client_key: string;
  p_request_hash: string;
  p_modality: GenerationModality;
  p_model_key: string;
  p_normalized_input: JsonValue;
  p_quote_id: string;
}>;

export type GenerationTaskRpcClient = Readonly<{
  rpc: (
    name: "submit_generation_task",
    args: SubmitGenerationTaskRpcArgs,
  ) => PromiseLike<
    Readonly<{ data: unknown; error: Readonly<{ message: string }> | null }>
  >;
}>;

export type SubmitGenerationTaskInput = Readonly<{
  clientKey: string;
  requestHash: string;
  modality: GenerationModality;
  modelKey: string;
  normalizedInput: JsonValue;
  quoteId: string;
}>;

export type SubmitGenerationTaskResult = Readonly<{
  taskId: string;
  reservationId: string;
  creditsReserved: number;
  wasReplayed: boolean;
}>;

type SubmitGenerationTaskRpcResult = Readonly<{
  task_id: string;
  reservation_id: string;
  credits_reserved: number;
  was_replayed: boolean;
}>;

export class GenerationRepositoryError extends Error {
  constructor(
    message: string,
    readonly code: "insufficient_credits" | "submission_failed",
  ) {
    super(message);
    this.name = "GenerationRepositoryError";
  }
}

function isResult(value: unknown): value is SubmitGenerationTaskRpcResult {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.task_id === "string" &&
    typeof candidate.reservation_id === "string" &&
    typeof candidate.credits_reserved === "number" &&
    Number.isSafeInteger(candidate.credits_reserved) &&
    candidate.credits_reserved >= 0 &&
    typeof candidate.was_replayed === "boolean"
  );
}

export class SupabaseGenerationRepository {
  constructor(private readonly client: GenerationTaskRpcClient) {}

  async submit(
    input: SubmitGenerationTaskInput,
  ): Promise<SubmitGenerationTaskResult> {
    const { data, error } = await this.client.rpc("submit_generation_task", {
      p_client_key: input.clientKey,
      p_request_hash: input.requestHash,
      p_modality: input.modality,
      p_model_key: input.modelKey,
      p_normalized_input: input.normalizedInput,
      p_quote_id: input.quoteId,
    });

    if (error) {
      const insufficient = /insufficient credits/i.test(error.message);
      throw new GenerationRepositoryError(
        insufficient
          ? "The account does not have enough credits."
          : "Unable to submit the generation task.",
        insufficient ? "insufficient_credits" : "submission_failed",
      );
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (!isResult(row)) {
      throw new GenerationRepositoryError(
        "Generation submission returned an invalid result.",
        "submission_failed",
      );
    }

    return {
      taskId: row.task_id,
      reservationId: row.reservation_id,
      creditsReserved: row.credits_reserved,
      wasReplayed: row.was_replayed,
    };
  }
}
