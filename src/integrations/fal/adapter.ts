import "server-only";

import {
  createFalClient,
  type FalClient,
  type QueueStatus,
} from "@fal-ai/client";

import type {
  GenerationInput,
  ProviderJobReference,
  ProviderJobState,
  ProviderResultReference,
  ProviderSubmission,
} from "@/domain/generation/modality-contract";
import { toProviderSubmission } from "@/domain/generation/modality-contract";
import type { JsonValue } from "@/domain/generation/request";
import {
  getFalServerConfig,
  type FalServerConfig,
} from "@/integrations/fal/config";

type FalAssetType = "image" | "video" | "audio";

export type FalClientLike = Pick<FalClient, "queue" | "storage">;

export class FalAdapterError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FalAdapterError";
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readAssetUrls(value: unknown): string[] {
  if (typeof value === "string") {
    return [value];
  }

  if (Array.isArray(value)) {
    return value.flatMap(readAssetUrls);
  }

  const record = asRecord(value);
  if (!record || typeof record.url !== "string") {
    return [];
  }

  return [record.url];
}

function safeHttpsUrl(value: string): string | null {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}

function assetTypeForSubmission(submission: ProviderSubmission): FalAssetType {
  switch (submission.modality) {
    case "text_to_image":
      return "image";
    case "image_to_video":
      return "video";
    case "text_to_speech":
      return "audio";
  }
}

export function falPayload(
  submission: ProviderSubmission,
): Record<string, unknown> {
  switch (submission.modelKey) {
    case "fal.flux.schnell":
    case "fal.flux.dev":
      if (submission.input.modality !== "text_to_image") {
        throw new FalAdapterError("Image model received an invalid input.");
      }
      return {
        prompt: submission.input.prompt,
        ...(submission.input.imageSize === undefined
          ? {}
          : { image_size: submission.input.imageSize }),
      };
    case "fal.flux.dev.image_to_image":
      if (
        submission.input.modality !== "text_to_image" ||
        !submission.input.referenceImageUrl
      ) {
        throw new FalAdapterError(
          "Image-to-image model requires a reference image.",
        );
      }
      return {
        image_url: submission.input.referenceImageUrl,
        prompt: submission.input.prompt,
        strength: 0.8,
      };
    case "fal.kling.v2_1.standard.image_to_video":
      if (submission.input.modality !== "image_to_video") {
        throw new FalAdapterError("Video model received an invalid input.");
      }
      return {
        image_url: submission.input.imageUrl,
        prompt: submission.input.prompt,
        ...(submission.input.duration === undefined
          ? {}
          : { duration: submission.input.duration }),
      };
    case "fal.kling.v3.standard.image_to_video":
      if (submission.input.modality !== "image_to_video") {
        throw new FalAdapterError("Video model received an invalid input.");
      }
      return {
        start_image_url: submission.input.imageUrl,
        prompt: submission.input.prompt,
        generate_audio: false,
        ...(submission.input.duration === undefined
          ? {}
          : { duration: submission.input.duration }),
      };
    case "fal.minimax.speech_02_hd":
      if (submission.input.modality !== "text_to_speech") {
        throw new FalAdapterError("Speech model received an invalid input.");
      }
      return {
        text: submission.input.text,
        ...(submission.input.voiceId === undefined
          ? {}
          : { voice_setting: { voice_id: submission.input.voiceId } }),
      };
    case "fal.minimax.speech_2_8_turbo":
      if (submission.input.modality !== "text_to_speech") {
        throw new FalAdapterError("Speech model received an invalid input.");
      }
      return {
        prompt: submission.input.text,
        ...(submission.input.voiceId === undefined
          ? {}
          : { voice_setting: { voice_id: submission.input.voiceId } }),
      };
  }
}

export function mapFalResult(
  submission: ProviderSubmission,
  requestId: string,
  data: unknown,
): ProviderResultReference {
  const payload = asRecord(data);
  if (!payload) {
    throw new FalAdapterError("fal returned an invalid result payload.");
  }

  const candidates =
    submission.modality === "text_to_image"
      ? readAssetUrls(payload.images)
      : submission.modality === "image_to_video"
        ? readAssetUrls(payload.video)
        : readAssetUrls(payload.audio);
  const assetType = assetTypeForSubmission(submission);
  const assets = candidates
    .map(safeHttpsUrl)
    .filter((url): url is string => url !== null)
    .map((url) => ({ url, contentType: assetType }));

  if (assets.length === 0) {
    throw new FalAdapterError(
      "fal completed without a supported result asset.",
    );
  }

  return { assets, providerRequestId: requestId };
}

function mapQueueStatus(status: QueueStatus): ProviderJobState {
  switch (status.status) {
    case "IN_QUEUE":
      return { externalTaskId: status.request_id, status: "queued" };
    case "IN_PROGRESS":
      return { externalTaskId: status.request_id, status: "processing" };
    case "COMPLETED":
      return { externalTaskId: status.request_id, status: "succeeded" };
  }
}

export class FalGenerationAdapter {
  constructor(
    private readonly client: FalClientLike,
    private readonly config: Pick<
      FalServerConfig,
      "webhookUrl" | "webhookToken"
    >,
  ) {}

  private webhookUrl(): string {
    const url = new URL(this.config.webhookUrl);
    url.searchParams.set("token", this.config.webhookToken);
    return url.toString();
  }

  async submit(
    input: GenerationInput,
    modelKey?: string,
  ): Promise<ProviderJobReference> {
    const submission = toProviderSubmission(input, modelKey);
    const queued = await this.client.queue.submit(submission.modelId, {
      input: falPayload(submission) as never,
      webhookUrl: this.webhookUrl(),
    });

    return {
      externalTaskId: queued.request_id,
      statusUrl: queued.status_url,
      responseUrl: queued.response_url,
    };
  }

  async getStatus(
    input: GenerationInput,
    externalTaskId: string,
    modelKey?: string,
  ): Promise<ProviderJobState> {
    const submission = toProviderSubmission(input, modelKey);
    const status = await this.client.queue.status(submission.modelId, {
      requestId: externalTaskId,
    });
    return mapQueueStatus(status);
  }

  async getResult(
    input: GenerationInput,
    externalTaskId: string,
    modelKey?: string,
  ): Promise<ProviderResultReference> {
    const submission = toProviderSubmission(input, modelKey);
    const result = await this.client.queue.result(submission.modelId, {
      requestId: externalTaskId,
    });
    return mapFalResult(submission, result.requestId, result.data);
  }

  async uploadInput(file: Blob): Promise<string> {
    return this.client.storage.upload(file, {
      lifecycle: { expiresIn: "1d", initialAcl: { default: "allow" } },
    });
  }
}

export function createFalGenerationAdapter(): FalGenerationAdapter {
  const config = getFalServerConfig();
  return new FalGenerationAdapter(
    createFalClient({ credentials: config.apiKey }),
    config,
  );
}

export function toSafeProviderMetadata(value: unknown): JsonValue {
  if (
    value === null ||
    typeof value === "boolean" ||
    typeof value === "number"
  ) {
    return value;
  }
  if (typeof value === "string") {
    return value.slice(0, 1_000);
  }
  if (Array.isArray(value)) {
    return value.slice(0, 20).map(toSafeProviderMetadata);
  }
  const record = asRecord(value);
  if (!record) {
    return "unsupported";
  }

  return Object.fromEntries(
    Object.entries(record)
      .filter(([key]) => !/authorization|credential|secret|token/i.test(key))
      .slice(0, 40)
      .map(([key, entry]) => [key, toSafeProviderMetadata(entry)]),
  );
}
