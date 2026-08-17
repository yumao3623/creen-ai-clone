import { describe, expect, it } from "vitest";

import { readGenerationPrompt, readGenerationResultAssets } from "./result";

describe("generation result readers", () => {
  it("keeps only HTTPS result assets with known media types", () => {
    expect(
      readGenerationResultAssets({
        assets: [
          { contentType: "image", url: "https://example.test/result.png" },
          { contentType: "video", url: "http://example.test/result.mp4" },
          { contentType: "unknown", url: "https://example.test/result" },
        ],
      }),
    ).toEqual([
      { contentType: "image", url: "https://example.test/result.png" },
    ]);
  });

  it("reads the persisted text field for each real modality", () => {
    expect(
      readGenerationPrompt("text_to_image", { prompt: "A clean still life" }),
    ).toBe("A clean still life");
    expect(
      readGenerationPrompt("text_to_speech", { text: "Read this aloud" }),
    ).toBe("Read this aloud");
  });
});
