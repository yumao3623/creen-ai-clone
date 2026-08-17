import type { JsonValue } from "@/domain/generation/request";
import type {
  GenerationModality,
  GenerationStatus,
} from "@/domain/generation/state";
import {
  defaultModelForModality,
  defaultModelKeys,
  modelDefinitionForKey,
  type FalModelId,
  type FalModelKey,
} from "./model-registry";

export {
  defaultModelKeys,
  type FalModelId,
  type FalModelKey,
} from "./model-registry";

export const falModelIds = {
  text_to_image: defaultModelForModality("text_to_image").id,
  image_to_video: defaultModelForModality("image_to_video").id,
  text_to_speech: defaultModelForModality("text_to_speech").id,
} as const;

export const falModelKeys = defaultModelKeys;

export type TextToImageInput = Readonly<{
  modality: "text_to_image";
  prompt: string;
  imageSize?: "square" | "square_hd" | "portrait_4_3" | "landscape_4_3";
  referenceImageUrl?: string;
}>;

export type ImageToVideoInput = Readonly<{
  modality: "image_to_video";
  imageUrl: string;
  prompt: string;
  duration?: "5" | "10";
}>;

export type TextToSpeechInput = Readonly<{
  modality: "text_to_speech";
  text: string;
  voiceId?: string;
}>;

export type GenerationInput =
  TextToImageInput | ImageToVideoInput | TextToSpeechInput;

export type ProviderSubmission = Readonly<{
  modality: GenerationModality;
  modelId: FalModelId;
  modelKey: FalModelKey;
  input: GenerationInput;
}>;

export type ProviderJobReference = Readonly<{
  externalTaskId: string;
  statusUrl: string;
  responseUrl: string;
}>;

export type ProviderResultReference = Readonly<{
  assets: readonly Readonly<{
    url: string;
    contentType: "image" | "video" | "audio";
  }>[];
  providerRequestId: string;
}>;

export type ProviderJobState = Readonly<{
  externalTaskId: string;
  status: Extract<GenerationStatus, "queued" | "processing" | "succeeded">;
  result?: ProviderResultReference;
}>;

export type ProviderWebhookEvent = Readonly<{
  externalTaskId: string;
  status: Extract<GenerationStatus, "succeeded" | "failed">;
  result?: ProviderResultReference;
  failureCode?: string;
  raw: JsonValue;
}>;

export class GenerationInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GenerationInputError";
  }
}

function nonEmptyText(value: unknown, field: string, maximum: number): string {
  if (typeof value !== "string") {
    throw new GenerationInputError(`${field} must be a string.`);
  }

  const normalized = value.trim();
  if (!normalized || normalized.length > maximum) {
    throw new GenerationInputError(
      `${field} must contain between 1 and ${maximum} characters.`,
    );
  }

  return normalized;
}

function httpsUrl(value: unknown, field: string): string {
  const stringValue = nonEmptyText(value, field, 2_048);
  try {
    const parsed = new URL(stringValue);
    if (parsed.protocol !== "https:") {
      throw new Error("Only HTTPS URLs are supported.");
    }
    return parsed.toString();
  } catch {
    throw new GenerationInputError(`${field} must be a valid HTTPS URL.`);
  }
}

function optionalString(
  value: unknown,
  field: string,
  maximum: number,
): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  return nonEmptyText(value, field, maximum);
}

function optionalHttpsUrl(value: unknown, field: string): string | undefined {
  if (value === undefined) return undefined;
  return httpsUrl(value, field);
}

export function modelForModality(modality: GenerationModality): Readonly<{
  id: FalModelId;
  key: FalModelKey;
}> {
  const model = defaultModelForModality(modality);
  return { id: model.id as FalModelId, key: model.key as FalModelKey };
}

export function parseGenerationInput(value: unknown): GenerationInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new GenerationInputError("Generation input must be an object.");
  }

  const input = value as Record<string, unknown>;
  switch (input.modality) {
    case "text_to_image": {
      const imageSize = input.imageSize;
      if (
        imageSize !== undefined &&
        imageSize !== "square" &&
        imageSize !== "square_hd" &&
        imageSize !== "portrait_4_3" &&
        imageSize !== "landscape_4_3"
      ) {
        throw new GenerationInputError("imageSize is not supported.");
      }
      const referenceImageUrl =
        input.referenceImageUrl === undefined
          ? undefined
          : optionalHttpsUrl(input.referenceImageUrl, "referenceImageUrl");
      return {
        modality: "text_to_image",
        prompt: nonEmptyText(input.prompt, "prompt", 2_000),
        ...(imageSize === undefined ? {} : { imageSize }),
        ...(referenceImageUrl === undefined ? {} : { referenceImageUrl }),
      };
    }
    case "image_to_video": {
      const duration = input.duration;
      if (duration !== undefined && duration !== "5" && duration !== "10") {
        throw new GenerationInputError(
          "duration must be either 5 or 10 seconds.",
        );
      }
      return {
        modality: "image_to_video",
        imageUrl: httpsUrl(input.imageUrl, "imageUrl"),
        prompt: nonEmptyText(input.prompt, "prompt", 2_000),
        ...(duration === undefined ? {} : { duration }),
      };
    }
    case "text_to_speech": {
      const voiceId = optionalString(input.voiceId, "voiceId", 128);
      return {
        modality: "text_to_speech",
        text: nonEmptyText(input.text, "text", 5_000),
        ...(voiceId === undefined ? {} : { voiceId }),
      };
    }
    default:
      throw new GenerationInputError("Unsupported generation modality.");
  }
}

export function toProviderSubmission(
  input: GenerationInput,
  modelKey?: FalModelKey | string,
): ProviderSubmission {
  const selectedKey = modelKey ?? modelForModality(input.modality).key;
  const model = modelDefinitionForKey(selectedKey);
  if (!model || model.modality !== input.modality) {
    throw new GenerationInputError(
      "The selected model does not match the modality.",
    );
  }
  const expectsReferenceImage =
    input.modality === "text_to_image" && input.referenceImageUrl !== undefined;
  if (model.supportsReferenceImage !== expectsReferenceImage) {
    throw new GenerationInputError(
      expectsReferenceImage
        ? "The selected model does not support reference images."
        : "A reference-image model requires a reference image.",
    );
  }
  return {
    modality: input.modality,
    modelId: model.id as FalModelId,
    modelKey: model.key as FalModelKey,
    input,
  };
}
