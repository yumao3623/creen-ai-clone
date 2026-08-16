import { describe, expect, it } from "vitest";

import { modelContent } from "@/content/models";

describe("Phase 10 typed model content", () => {
  it("keeps one distinct, descriptive record for each approved modality", () => {
    expect(modelContent.map(({ modality }) => modality)).toEqual([
      "Text to Image",
      "Image to Video",
      "Text to Speech",
    ]);
    expect(
      modelContent.every(({ description }) => description.length > 0),
    ).toBe(true);
  });
});
