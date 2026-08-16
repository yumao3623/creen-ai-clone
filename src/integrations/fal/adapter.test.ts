import { describe, expect, it } from "vitest";

import { parseGenerationInput } from "@/domain/generation/modality-contract";
import {
  FalGenerationAdapter,
  mapFalResult,
  type FalClientLike,
} from "@/integrations/fal/adapter";

function isolatedFalClient(): FalClientLike {
  return {
    queue: {
      submit: async () => ({
        status: "IN_QUEUE",
        request_id: "fal-request-1",
        queue_position: 1,
        status_url: "https://queue.fal.run/status/fal-request-1",
        response_url: "https://queue.fal.run/result/fal-request-1",
        cancel_url: "https://queue.fal.run/cancel/fal-request-1",
      }),
      status: async () => ({
        status: "IN_PROGRESS",
        request_id: "fal-request-1",
        logs: [],
        status_url: "https://queue.fal.run/status/fal-request-1",
        response_url: "https://queue.fal.run/result/fal-request-1",
        cancel_url: "https://queue.fal.run/cancel/fal-request-1",
      }),
      result: async () => ({
        requestId: "fal-request-1",
        data: { images: [{ url: "https://fal.media/result.png" }] },
      }),
    },
    storage: {
      upload: async () => "https://fal.media/input.png",
    },
  } as unknown as FalClientLike;
}

describe("fal generation adapter", () => {
  it("submits through the queue API and checks queue status", async () => {
    const adapter = new FalGenerationAdapter(isolatedFalClient(), {
      webhookUrl: "https://app.example.com/api/webhooks/fal",
      webhookToken: "a-32-character-webhook-token-value",
    });
    const input = parseGenerationInput({
      modality: "text_to_image",
      prompt: "A paper lantern at dusk",
    });

    await expect(adapter.submit(input)).resolves.toMatchObject({
      externalTaskId: "fal-request-1",
    });
    await expect(adapter.getStatus(input, "fal-request-1")).resolves.toEqual({
      externalTaskId: "fal-request-1",
      status: "processing",
    });
  });

  it("maps only HTTPS assets from a completed provider result", () => {
    const input = parseGenerationInput({
      modality: "text_to_speech",
      text: "Hello from an isolated contract test.",
    });
    expect(() =>
      mapFalResult(
        {
          modality: input.modality,
          modelId: "fal-ai/minimax/speech-02-hd",
          modelKey: "fal.minimax.speech_02_hd",
          input,
        },
        "fal-request-2",
        { audio: { url: "http://unsafe.example.com/result.mp3" } },
      ),
    ).toThrow("completed without a supported result asset");
  });
});
