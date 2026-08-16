import { describe, expect, it } from "vitest";

import { hashGenerationRequest } from "@/domain/generation/request";

describe("generation request hash", () => {
  it("is stable when normalized JSON object keys arrive in a different order", () => {
    const shared = {
      modality: "text_to_image" as const,
      modelKey: "fal.image.fast",
      quoteId: "4a0182f6-6b32-4fd5-9e8a-bb0e2b5f3d5d",
    };

    expect(
      hashGenerationRequest({
        ...shared,
        normalizedInput: { prompt: "a lighthouse", options: { width: 1024 } },
      }),
    ).toBe(
      hashGenerationRequest({
        ...shared,
        normalizedInput: { options: { width: 1024 }, prompt: "a lighthouse" },
      }),
    );
  });

  it("changes when a security-relevant submission field changes", () => {
    const shared = {
      modality: "text_to_image" as const,
      modelKey: "fal.image.fast",
      normalizedInput: { prompt: "a lighthouse" },
    };

    expect(
      hashGenerationRequest({
        ...shared,
        quoteId: "4a0182f6-6b32-4fd5-9e8a-bb0e2b5f3d5d",
      }),
    ).not.toBe(
      hashGenerationRequest({
        ...shared,
        quoteId: "6d8ea554-4d5f-40e0-a5d8-0484c562783f",
      }),
    );
  });
});
