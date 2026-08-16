import "server-only";

import type { GenerationInput } from "@/domain/generation/modality-contract";
import type { GenerationModality } from "@/domain/generation/state";

type CreateQuoteRpcArgs = Readonly<{
  p_modality: GenerationModality;
  p_model_key: string;
  p_normalized_input: GenerationInput;
}>;

export type CreditsRpcClient = Readonly<{
  rpc: (
    name: "create_generation_quote",
    args: CreateQuoteRpcArgs,
  ) => PromiseLike<
    Readonly<{
      data: unknown;
      error: Readonly<{ message: string }> | null;
    }>
  >;
}>;

export type GenerationQuote = Readonly<{
  quoteId: string;
  priceVersionId: string;
  creditsCost: number;
  parameterKey: string;
  expiresAt: string;
}>;

type GenerationQuoteRow = Readonly<{
  quote_id: string;
  price_version_id: string;
  credits_cost: number;
  parameter_key: string;
  expires_at: string;
}>;

export class CreditsRepositoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CreditsRepositoryError";
  }
}

function isQuoteRow(value: unknown): value is GenerationQuoteRow {
  if (!value || typeof value !== "object") {
    return false;
  }

  const row = value as Record<string, unknown>;
  return (
    typeof row.quote_id === "string" &&
    typeof row.price_version_id === "string" &&
    typeof row.credits_cost === "number" &&
    Number.isSafeInteger(row.credits_cost) &&
    row.credits_cost >= 0 &&
    typeof row.parameter_key === "string" &&
    typeof row.expires_at === "string"
  );
}

export class SupabaseCreditsRepository {
  constructor(private readonly client: CreditsRpcClient) {}

  async createQuote(
    input: Readonly<{
      generationInput: GenerationInput;
      modelKey: string;
    }>,
  ): Promise<GenerationQuote> {
    const { data, error } = await this.client.rpc("create_generation_quote", {
      p_modality: input.generationInput.modality,
      p_model_key: input.modelKey,
      p_normalized_input: input.generationInput,
    });

    if (error) {
      throw new CreditsRepositoryError("Unable to create a generation quote.");
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (!isQuoteRow(row)) {
      throw new CreditsRepositoryError(
        "Generation quote returned an invalid result.",
      );
    }

    return {
      quoteId: row.quote_id,
      priceVersionId: row.price_version_id,
      creditsCost: row.credits_cost,
      parameterKey: row.parameter_key,
      expiresAt: row.expires_at,
    };
  }
}
