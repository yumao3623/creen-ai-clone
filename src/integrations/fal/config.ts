import "server-only";

import { falModelIds } from "@/domain/generation/modality-contract";

export type FalServerConfig = Readonly<{
  apiKey: string;
  webhookUrl: string;
  webhookToken: string;
}>;

function required(environment: NodeJS.ProcessEnv, name: string): string {
  const value = environment[name]?.trim();
  if (!value) {
    throw new Error(`${name} must be configured for fal generation.`);
  }
  return value;
}

function verifyModel(
  environment: NodeJS.ProcessEnv,
  name: string,
  expected: string,
): void {
  const value = required(environment, name);
  if (value !== expected) {
    throw new Error(`${name} must be ${expected}.`);
  }
}

export function getFalServerConfig(
  environment: NodeJS.ProcessEnv = process.env,
): FalServerConfig {
  verifyModel(
    environment,
    "FAL_TEXT_TO_IMAGE_MODEL",
    falModelIds.text_to_image,
  );
  verifyModel(
    environment,
    "FAL_IMAGE_TO_VIDEO_MODEL",
    falModelIds.image_to_video,
  );
  verifyModel(
    environment,
    "FAL_TEXT_TO_SPEECH_MODEL",
    falModelIds.text_to_speech,
  );

  const webhookUrl = new URL(required(environment, "FAL_WEBHOOK_URL"));
  if (webhookUrl.protocol !== "https:") {
    throw new Error("FAL_WEBHOOK_URL must use HTTPS.");
  }

  const webhookToken = required(environment, "FAL_WEBHOOK_TOKEN");
  if (webhookToken.length < 32) {
    throw new Error("FAL_WEBHOOK_TOKEN must contain at least 32 characters.");
  }

  return {
    apiKey: required(environment, "FAL_KEY"),
    webhookUrl: webhookUrl.toString(),
    webhookToken,
  };
}
