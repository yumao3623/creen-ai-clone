import { describe, expect, it } from "vitest";

import {
  GenerationInputError,
  modelForModality,
  parseGenerationInput,
  toProviderSubmission,
} from "@/domain/generation/modality-contract";

describe("Phase 6 generation modality contracts", () => {
  it("normalizes the three frozen fal model selections on the server", () => {
    expect(modelForModality("text_to_image")).toEqual({
      id: "fal-ai/flux/schnell",
      key: "fal.flux.schnell",
    });
    expect(modelForModality("image_to_video").id).toBe(
      "fal-ai/kling-video/v2.1/standard/image-to-video",
    );
    expect(modelForModality("text_to_speech").id).toBe(
      "fal-ai/minimax/speech-02-hd",
    );
  });

  it("accepts only the input shape of each supported modality", () => {
    expect(
      toProviderSubmission(
        parseGenerationInput({
          modality: "text_to_image",
          prompt: "  misty mountain  ",
        }),
      ),
    ).toMatchObject({
      modelId: "fal-ai/flux/schnell",
      input: { prompt: "misty mountain" },
    });

    expect(
      parseGenerationInput({
        modality: "image_to_video",
        imageUrl: "https://cdn.example.com/input.png",
        prompt: "gentle camera movement",
        duration: "5",
      }),
    ).toMatchObject({ modality: "image_to_video", duration: "5" });

    expect(
      parseGenerationInput({
        modality: "text_to_speech",
        text: "A short spoken sentence.",
        voiceId: "Wise_Woman",
      }),
    ).toMatchObject({ modality: "text_to_speech", voiceId: "Wise_Woman" });
  });

  it("rejects unsafe input URLs and unsupported modalities before fal is called", () => {
    expect(() =>
      parseGenerationInput({
        modality: "image_to_video",
        imageUrl: "http://example.com/input.png",
        prompt: "move",
      }),
    ).toThrow(GenerationInputError);
    expect(() => parseGenerationInput({ modality: "text_to_music" })).toThrow(
      "Unsupported generation modality",
    );
  });
});
