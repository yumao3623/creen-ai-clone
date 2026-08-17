import "server-only";

import type {
  GenerationInput,
  ProviderJobState,
} from "@/domain/generation/modality-contract";
import { FalGenerationAdapter } from "@/integrations/fal/adapter";

export async function reconcileFalGeneration(
  adapter: FalGenerationAdapter,
  input: GenerationInput,
  externalTaskId: string,
  modelKey?: string,
): Promise<ProviderJobState> {
  const state = await adapter.getStatus(input, externalTaskId, modelKey);
  if (state.status !== "succeeded") {
    return state;
  }

  const result = await adapter.getResult(input, externalTaskId, modelKey);
  return { ...state, result };
}
