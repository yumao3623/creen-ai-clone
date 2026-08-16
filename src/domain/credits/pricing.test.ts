import { describe, expect, it } from "vitest";

import { frozenCreditPrice } from "@/domain/credits/pricing";

describe("frozen Phase 7 credit pricing", () => {
  it("uses one production price basis across all three modalities", () => {
    expect(
      frozenCreditPrice({ modality: "text_to_image", prompt: "A lantern" }),
    ).toEqual({ parameterKey: "default", credits: 30 });
    expect(
      frozenCreditPrice({
        modality: "image_to_video",
        imageUrl: "https://fal.media/input.png",
        prompt: "Slow camera move",
      }),
    ).toEqual({ parameterKey: "duration_5", credits: 2_800 });
    expect(
      frozenCreditPrice({
        modality: "image_to_video",
        imageUrl: "https://fal.media/input.png",
        prompt: "Slow camera move",
        duration: "10",
      }),
    ).toEqual({ parameterKey: "duration_10", credits: 5_600 });
  });

  it("prices speech deterministically in ten-character units", () => {
    expect(
      frozenCreditPrice({ modality: "text_to_speech", text: "1234567890" }),
    ).toEqual({ parameterKey: "characters_10", credits: 6 });
    expect(
      frozenCreditPrice({ modality: "text_to_speech", text: "12345678901" }),
    ).toEqual({ parameterKey: "characters_10", credits: 12 });
  });
});
