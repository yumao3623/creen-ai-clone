import "server-only";

type ProviderSubmissionArgs = Readonly<{
  p_task_id: string;
  p_external_task_id: string;
  p_request_hash: string;
  p_model_key: string;
}>;

type CompensationArgs = Readonly<{
  p_task_id: string;
  p_failure_code: string;
}>;

export type GenerationLifecycleRpcClient = Readonly<{
  rpc: (
    name:
      | "record_generation_provider_submission"
      | "mark_generation_reconciliation_required"
      | "compensate_generation_task",
    args: ProviderSubmissionArgs | CompensationArgs,
  ) => PromiseLike<
    Readonly<{ data: unknown; error: Readonly<{ message: string }> | null }>
  >;
}>;

export class GenerationLifecycleRepositoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GenerationLifecycleRepositoryError";
  }
}

export class SupabaseGenerationLifecycleRepository {
  constructor(private readonly client: GenerationLifecycleRpcClient) {}

  async recordProviderSubmission(
    input: Readonly<{
      taskId: string;
      externalTaskId: string;
      requestHash: string;
      modelKey: string;
    }>,
  ): Promise<void> {
    const { error } = await this.client.rpc(
      "record_generation_provider_submission",
      {
        p_task_id: input.taskId,
        p_external_task_id: input.externalTaskId,
        p_request_hash: input.requestHash,
        p_model_key: input.modelKey,
      },
    );

    if (error) {
      throw new GenerationLifecycleRepositoryError(
        "Unable to persist the provider submission.",
      );
    }
  }

  async markReconciliationRequired(
    input: Readonly<{
      taskId: string;
      externalTaskId: string;
      requestHash: string;
      modelKey: string;
    }>,
  ): Promise<void> {
    const { error } = await this.client.rpc(
      "mark_generation_reconciliation_required",
      {
        p_task_id: input.taskId,
        p_external_task_id: input.externalTaskId,
        p_request_hash: input.requestHash,
        p_model_key: input.modelKey,
      },
    );

    if (error) {
      throw new GenerationLifecycleRepositoryError(
        "Unable to persist the reconciliation marker.",
      );
    }
  }

  async compensate(taskId: string, failureCode: string): Promise<void> {
    const { error } = await this.client.rpc("compensate_generation_task", {
      p_task_id: taskId,
      p_failure_code: failureCode,
    });

    if (error) {
      throw new GenerationLifecycleRepositoryError(
        "Unable to compensate the generation reservation.",
      );
    }
  }
}
