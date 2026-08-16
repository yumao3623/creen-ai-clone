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
): Promise<ProviderJobState> {
  const state = await adapter.getStatus(input, externalTaskId);
  if (state.status !== "succeeded") {
    return state;
  }

  const result = await adapter.getResult(input, externalTaskId);
  return { ...state, result };
}
