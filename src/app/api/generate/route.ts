import { NextResponse } from "next/server";

import {
  GenerationRepositoryError,
  SupabaseGenerationRepository,
} from "@/db/generation-repository";
import { SupabaseGenerationLifecycleRepository } from "@/db/generation-lifecycle-repository";
import {
  GenerationInputError,
  modelForModality,
  parseGenerationInput,
  toProviderSubmission,
} from "@/domain/generation/modality-contract";
import { hashGenerationRequest } from "@/domain/generation/request";
import { selectableModelForInput } from "@/domain/generation/model-registry";
import { createFalGenerationAdapter } from "@/integrations/fal/adapter";
import { createSupabaseAdminClient } from "@/integrations/supabase/admin";
import { createSupabaseServerClient } from "@/integrations/supabase/server";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function generationError(code: string, status: number, message?: string) {
  return NextResponse.json(
    { error: { code, ...(message === undefined ? {} : { message }) } },
    { status },
  );
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return generationError("auth_unavailable", 503);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return generationError("authentication_required", 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return generationError("invalid_json", 400);
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return generationError("invalid_generation_request", 400);
  }

  const requestBody = body as Record<string, unknown>;
  if (
    typeof requestBody.clientKey !== "string" ||
    !uuidPattern.test(requestBody.clientKey) ||
    typeof requestBody.quoteId !== "string" ||
    !uuidPattern.test(requestBody.quoteId)
  ) {
    return generationError("invalid_generation_request", 400);
  }

  let input;
  let modelKey: string;
  try {
    input = parseGenerationInput(requestBody.input);
    modelKey =
      typeof requestBody.modelKey === "string"
        ? requestBody.modelKey
        : modelForModality(input.modality).key;
    selectableModelForInput(
      modelKey,
      input.modality,
      input.modality === "text_to_image" &&
        input.referenceImageUrl !== undefined,
    );
  } catch (error) {
    return generationError(
      error instanceof GenerationInputError
        ? "invalid_generation_input"
        : "invalid_generation_request",
      400,
    );
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return generationError("generation_lifecycle_unavailable", 503);
  }

  let adapter;
  try {
    adapter = createFalGenerationAdapter();
  } catch {
    return generationError("generation_unavailable", 503);
  }

  const submission = toProviderSubmission(input, modelKey);
  const requestHash = hashGenerationRequest({
    modality: input.modality,
    modelKey: submission.modelKey,
    normalizedInput: input,
    quoteId: requestBody.quoteId,
  });
  const generationRepository = new SupabaseGenerationRepository(supabase);
  const lifecycleRepository = new SupabaseGenerationLifecycleRepository(admin);

  let reserved;
  try {
    reserved = await generationRepository.submit({
      clientKey: requestBody.clientKey,
      requestHash,
      modality: input.modality,
      modelKey: submission.modelKey,
      normalizedInput: input,
      quoteId: requestBody.quoteId,
    });
  } catch (error) {
    if (
      error instanceof GenerationRepositoryError &&
      error.code === "insufficient_credits"
    ) {
      return generationError(
        "insufficient_credits",
        409,
        "可用 Credits 不足，真实生成未提交。",
      );
    }
    return generationError("generation_reservation_failed", 503);
  }

  if (reserved.wasReplayed) {
    return NextResponse.json({
      taskId: reserved.taskId,
      creditsReserved: reserved.creditsReserved,
      replayed: true,
    });
  }

  let providerJob;
  try {
    providerJob = await adapter.submit(input, submission.modelKey);
  } catch {
    try {
      await lifecycleRepository.compensate(
        reserved.taskId,
        "provider_submit_failed",
      );
    } catch {
      return generationError("generation_compensation_failed", 503);
    }
    return generationError("provider_submission_failed", 502);
  }

  const lifecycleInput = {
    taskId: reserved.taskId,
    externalTaskId: providerJob.externalTaskId,
    requestHash,
    modelKey: submission.modelKey,
  };

  try {
    await lifecycleRepository.recordProviderSubmission(lifecycleInput);
  } catch {
    try {
      await lifecycleRepository.markReconciliationRequired(lifecycleInput);
    } catch {
      return generationError("generation_reconciliation_persist_failed", 503);
    }

    return NextResponse.json(
      {
        taskId: reserved.taskId,
        creditsReserved: reserved.creditsReserved,
        status: "reconciliation_required",
      },
      { status: 202 },
    );
  }

  return NextResponse.json(
    {
      taskId: reserved.taskId,
      creditsReserved: reserved.creditsReserved,
      status: "queued",
    },
    { status: 202 },
  );
}
