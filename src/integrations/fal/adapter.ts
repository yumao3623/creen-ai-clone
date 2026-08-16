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

function falPayload(input: GenerationInput): Record<string, unknown> {
  switch (input.modality) {
    case "text_to_image":
      return {
        prompt: input.prompt,
        ...(input.imageSize === undefined
          ? {}
          : { image_size: input.imageSize }),
      };
    case "image_to_video":
      return {
        image_url: input.imageUrl,
        prompt: input.prompt,
        ...(input.duration === undefined ? {} : { duration: input.duration }),
      };
    case "text_to_speech":
      return {
        text: input.text,
        ...(input.voiceId === undefined
          ? {}
          : { voice_setting: { voice_id: input.voiceId } }),
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

  async submit(input: GenerationInput): Promise<ProviderJobReference> {
    const submission = toProviderSubmission(input);
    const queued = await this.client.queue.submit(submission.modelId, {
      input: falPayload(input) as never,
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
  ): Promise<ProviderJobState> {
    const submission = toProviderSubmission(input);
    const status = await this.client.queue.status(submission.modelId, {
      requestId: externalTaskId,
    });
    return mapQueueStatus(status);
  }

  async getResult(
    input: GenerationInput,
    externalTaskId: string,
  ): Promise<ProviderResultReference> {
    const submission = toProviderSubmission(input);
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
