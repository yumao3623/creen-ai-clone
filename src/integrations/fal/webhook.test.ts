import { describe, expect, it } from "vitest";

import {
  isValidWebhookToken,
  parseFalWebhook,
  parseFalWebhookEnvelope,
} from "@/integrations/fal/webhook";

describe("fal webhook contract", () => {
  const token = "a-32-character-webhook-token-value";

  it("uses a constant-time shared callback token and rejects missing tokens", () => {
    expect(isValidWebhookToken(token, token)).toBe(true);
    expect(isValidWebhookToken("wrong", token)).toBe(false);
    expect(isValidWebhookToken(null, token)).toBe(false);
  });

  it("maps successful and failed terminal payloads without inventing results", () => {
    const input = {
      modality: "text_to_image" as const,
      prompt: "rainy train station",
    };
    expect(
      parseFalWebhook(input, {
        status: "OK",
        request_id: "fal-request-3",
        payload: { images: [{ url: "https://fal.media/result.png" }] },
      }),
    ).toMatchObject({ status: "succeeded", externalTaskId: "fal-request-3" });
    expect(
      parseFalWebhook(input, {
        status: "ERROR",
        request_id: "fal-request-4",
        payload: { detail: "provider error" },
      }),
    ).toMatchObject({ status: "failed", failureCode: "provider_failed" });
  });

  it("rejects non-terminal or malformed provider callbacks", () => {
    expect(() => parseFalWebhookEnvelope({ status: "IN_PROGRESS" })).toThrow(
      "fal webhook payload is invalid",
    );
    expect(() =>
      parseFalWebhookEnvelope({
        status: "IN_PROGRESS",
        request_id: "fal-request-5",
      }),
    ).toThrow("fal webhook status is not terminal");
  });
});
