import { NextResponse } from "next/server";

import { SupabaseCreditsRepository } from "@/db/credits-repository";
import {
  GenerationInputError,
  parseGenerationInput,
  toProviderSubmission,
} from "@/domain/generation/modality-contract";
import { createSupabaseServerClient } from "@/integrations/supabase/server";

function quoteError(code: string, status: number) {
  return NextResponse.json({ error: { code } }, { status });
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return quoteError("auth_unavailable", 503);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return quoteError("authentication_required", 401);
  }

  let input;
  try {
    input = parseGenerationInput(await request.json());
  } catch (error) {
    return quoteError(
      error instanceof GenerationInputError
        ? "invalid_generation_input"
        : "invalid_json",
      400,
    );
  }

  try {
    const submission = toProviderSubmission(input);
    const repository = new SupabaseCreditsRepository(supabase);
    const quote = await repository.createQuote({
      generationInput: input,
      modelKey: submission.modelKey,
    });
    return NextResponse.json({ quote });
  } catch {
    return quoteError("quote_unavailable", 503);
  }
}
