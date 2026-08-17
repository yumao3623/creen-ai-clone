import { describe, expect, it } from "vitest";

import {
  FalWebhookRepositoryError,
  SupabaseFalWebhookRepository,
  type FalWebhookRpcClient,
} from "@/db/fal-webhook-repository";

describe("fal webhook repository", () => {
  it("loads the task input required for trusted result mapping", async () => {
    const client: FalWebhookRpcClient = {
      rpc: async () => ({
        data: [
          {
            task_id: "task-1",
            model_key: "fal.flux.schnell",
            normalized_input: {
              modality: "text_to_image",
              prompt: "rainy station",
            },
            task_status: "queued",
          },
        ],
        error: null,
      }),
    };

    await expect(
      new SupabaseFalWebhookRepository(client).getContext("fal-request-1"),
    ).resolves.toMatchObject({ taskId: "task-1", taskStatus: "queued" });
  });

  it("normalizes an atomic settlement and replay result", async () => {
    const client: FalWebhookRpcClient = {
      rpc: async () => ({
        data: [
          {
            task_id: "task-1",
            was_replayed: true,
            task_status: "succeeded",
          },
        ],
        error: null,
      }),
    };

    await expect(
      new SupabaseFalWebhookRepository(client).finalize({
        externalTaskId: "fal-request-1",
        payloadHash: "a".repeat(64),
        payload: { status: "OK" },
        succeeded: true,
        resultReference: {
          assets: [
            { url: "https://fal.media/result.png", contentType: "image" },
          ],
          providerRequestId: "fal-request-1",
        },
      }),
    ).resolves.toEqual({
      taskId: "task-1",
      wasReplayed: true,
      taskStatus: "succeeded",
    });
  });

  it("does not treat invalid database responses as an accepted webhook", async () => {
    const client: FalWebhookRpcClient = {
      rpc: async () => ({ data: null, error: null }),
    };
    await expect(
      new SupabaseFalWebhookRepository(client).getContext("fal-request-1"),
    ).rejects.toBeInstanceOf(FalWebhookRepositoryError);
  });
});
