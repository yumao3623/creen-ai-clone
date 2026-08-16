import { describe, expect, it } from "vitest";

import { parseGenerationInput } from "@/domain/generation/modality-contract";
import {
  FalGenerationAdapter,
  type FalClientLike,
} from "@/integrations/fal/adapter";
import { reconcileFalGeneration } from "@/integrations/fal/reconciliation";

const completedClient = {
  queue: {
    status: async () => ({
      status: "COMPLETED",
      request_id: "fal-request-complete",
      logs: [],
      status_url: "https://queue.fal.run/status/fal-request-complete",
      response_url: "https://queue.fal.run/result/fal-request-complete",
      cancel_url: "https://queue.fal.run/cancel/fal-request-complete",
    }),
    result: async () => ({
      requestId: "fal-request-complete",
      data: { video: { url: "https://fal.media/result.mp4" } },
    }),
  },
} as unknown as FalClientLike;

describe("fal reconciliation", () => {
  it("only records a result after fal reports a completed queue state", async () => {
    const adapter = new FalGenerationAdapter(completedClient, {
      webhookUrl: "https://app.example.com/api/webhooks/fal",
      webhookToken: "a-32-character-webhook-token-value",
    });
    const input = parseGenerationInput({
      modality: "image_to_video",
      imageUrl: "https://fal.media/input.png",
      prompt: "Slow dolly forward",
    });

    await expect(
      reconcileFalGeneration(adapter, input, "fal-request-complete"),
    ).resolves.toMatchObject({
      status: "succeeded",
      result: { assets: [{ contentType: "video" }] },
    });
  });
});
