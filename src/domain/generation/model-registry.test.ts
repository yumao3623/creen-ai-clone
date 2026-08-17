import { describe, expect, it } from "vitest";

import {
  defaultModelForModality,
  modelDefinitionForKey,
  modelsForModality,
  selectableModelForInput,
} from "@/domain/generation/model-registry";

describe("generation model registry", () => {
  it("exposes the verified default and alternatives per modality", () => {
    expect(defaultModelForModality("text_to_image").key).toBe(
      "fal.flux.schnell",
    );
    expect(
      modelsForModality("text_to_image").map((model) => model.key),
    ).toEqual(["fal.flux.schnell", "fal.flux.dev"]);
    expect(modelsForModality("image_to_video")).toHaveLength(2);
    expect(modelsForModality("text_to_speech")).toHaveLength(2);
  });

  it("keeps reference-image selection separate from text-to-image", () => {
    expect(
      modelsForModality("text_to_image", { referenceImage: true }).map(
        (model) => model.key,
      ),
    ).toEqual(["fal.flux.dev.image_to_image"]);
  });

  it("rejects a model from another modality", () => {
    expect(() =>
      selectableModelForInput(
        "fal.kling.v2_1.standard.image_to_video",
        "text_to_image",
        false,
      ),
    ).toThrow("selected generation model");
    expect(modelDefinitionForKey("missing")).toBeUndefined();
  });
});
