import { describe, expect, it } from "vitest";

import {
  assertGenerationTransition,
  canTransitionGeneration,
  GenerationStateError,
} from "@/domain/generation/state";

describe("generation state machine", () => {
  it("allows the normal queued to processing to succeeded path", () => {
    expect(canTransitionGeneration("queued", "processing")).toBe(true);
    expect(() =>
      assertGenerationTransition({
        current: "processing",
        next: "succeeded",
        resultReference: { assetId: "asset-1" },
      }),
    ).not.toThrow();
  });

  it("permits idempotent repeats and requires a result to succeed", () => {
    expect(canTransitionGeneration("processing", "processing")).toBe(true);
    expect(() =>
      assertGenerationTransition({ current: "processing", next: "succeeded" }),
    ).toThrow(GenerationStateError);
  });

  it("rejects transitions out of a terminal state", () => {
    expect(() =>
      assertGenerationTransition({
        current: "failed",
        next: "queued",
      }),
    ).toThrow("failed -> queued");
  });
});
