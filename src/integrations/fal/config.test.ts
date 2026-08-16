import { describe, expect, it } from "vitest";

import { getFalServerConfig } from "@/integrations/fal/config";

const configuredEnvironment = {
  FAL_KEY: "key-for-isolated-test",
  FAL_TEXT_TO_IMAGE_MODEL: "fal-ai/flux/schnell",
  FAL_IMAGE_TO_VIDEO_MODEL: "fal-ai/kling-video/v2.1/standard/image-to-video",
  FAL_TEXT_TO_SPEECH_MODEL: "fal-ai/minimax/speech-02-hd",
  FAL_WEBHOOK_URL: "https://app.example.com/api/webhooks/fal",
  FAL_WEBHOOK_TOKEN: "a-32-character-webhook-token-value",
} as unknown as NodeJS.ProcessEnv;

describe("fal server configuration", () => {
  it("requires a complete server-only model allow-list", () => {
    expect(getFalServerConfig(configuredEnvironment)).toMatchObject({
      webhookUrl: "https://app.example.com/api/webhooks/fal",
    });

    expect(() =>
      getFalServerConfig({
        ...configuredEnvironment,
        FAL_TEXT_TO_IMAGE_MODEL: "fal-ai/unknown-model",
      }),
    ).toThrow("FAL_TEXT_TO_IMAGE_MODEL must be fal-ai/flux/schnell");
  });

  it("does not permit an insecure callback URL or short webhook token", () => {
    expect(() =>
      getFalServerConfig({
        ...configuredEnvironment,
        FAL_WEBHOOK_URL: "http://app.example.com/api/webhooks/fal",
      }),
    ).toThrow("FAL_WEBHOOK_URL must use HTTPS");
    expect(() =>
      getFalServerConfig({
        ...configuredEnvironment,
        FAL_WEBHOOK_TOKEN: "short",
      }),
    ).toThrow("FAL_WEBHOOK_TOKEN must contain at least 32 characters");
  });
});
