import type { GenerationModality } from "./state";

export type GenerationModelKind =
  "text_to_image" | "image_to_image" | "image_to_video" | "text_to_speech";

type ModelStatus = "verified" | "candidate";

export type GenerationModelDefinition = Readonly<{
  key: string;
  id: string;
  modality: GenerationModality;
  kind: GenerationModelKind;
  label: string;
  description: string;
  status: ModelStatus;
  supportsReferenceImage: boolean;
  voiceContract?: "minimax";
  previewCredits: number;
}>;

export const generationModels = [
  {
    key: "fal.flux.schnell",
    id: "fal-ai/flux/schnell",
    modality: "text_to_image",
    kind: "text_to_image",
    label: "Flux Schnell",
    description: "快速、低成本图片生成",
    status: "verified",
    supportsReferenceImage: false,
    previewCredits: 30,
  },
  {
    key: "fal.flux.dev",
    id: "fal-ai/flux/dev",
    modality: "text_to_image",
    kind: "text_to_image",
    label: "Flux Dev",
    description: "更高质量的图片生成",
    status: "verified",
    supportsReferenceImage: false,
    previewCredits: 250,
  },
  {
    key: "fal.flux.dev.image_to_image",
    id: "fal-ai/flux/dev/image-to-image",
    modality: "text_to_image",
    kind: "image_to_image",
    label: "Flux Dev 图片参考",
    description: "使用参考图进行图片变换",
    status: "verified",
    supportsReferenceImage: true,
    previewCredits: 300,
  },
  {
    key: "fal.kling.v2_1.standard.image_to_video",
    id: "fal-ai/kling-video/v2.1/standard/image-to-video",
    modality: "image_to_video",
    kind: "image_to_video",
    label: "Kling 2.1 Standard",
    description: "稳定、成本可控的图片转视频",
    status: "verified",
    supportsReferenceImage: false,
    previewCredits: 2_800,
  },
  {
    key: "fal.kling.v3.standard.image_to_video",
    id: "fal-ai/kling-video/v3/standard/image-to-video",
    modality: "image_to_video",
    kind: "image_to_video",
    label: "Kling 3 Standard",
    description: "更高质量的图片转视频，不生成原生音频",
    status: "verified",
    supportsReferenceImage: false,
    previewCredits: 4_200,
  },
  {
    key: "fal.minimax.speech_02_hd",
    id: "fal-ai/minimax/speech-02-hd",
    modality: "text_to_speech",
    kind: "text_to_speech",
    label: "MiniMax Speech 02 HD",
    description: "高质量文字转语音",
    status: "verified",
    supportsReferenceImage: false,
    voiceContract: "minimax",
    previewCredits: 6,
  },
  {
    key: "fal.minimax.speech_2_8_turbo",
    id: "fal-ai/minimax/speech-2.8-turbo",
    modality: "text_to_speech",
    kind: "text_to_speech",
    label: "MiniMax Speech 2.8 Turbo",
    description: "更快的文字转语音",
    status: "verified",
    supportsReferenceImage: false,
    voiceContract: "minimax",
    previewCredits: 6,
  },
] as const satisfies readonly GenerationModelDefinition[];

export type FalModelKey = (typeof generationModels)[number]["key"];
export type FalModelId = (typeof generationModels)[number]["id"];

export const defaultModelKeys: Readonly<
  Record<GenerationModality, FalModelKey>
> = {
  text_to_image: "fal.flux.schnell",
  image_to_video: "fal.kling.v2_1.standard.image_to_video",
  text_to_speech: "fal.minimax.speech_02_hd",
};

export function modelDefinitionForKey(
  key: string,
): GenerationModelDefinition | undefined {
  return generationModels.find((model) => model.key === key);
}

export function defaultModelForModality(
  modality: GenerationModality,
): GenerationModelDefinition {
  return modelDefinitionForKey(defaultModelKeys[modality])!;
}

export function modelsForModality(
  modality: GenerationModality,
  options: Readonly<{ referenceImage: boolean }> = { referenceImage: false },
): readonly GenerationModelDefinition[] {
  return generationModels.filter(
    (model) =>
      model.status === "verified" &&
      model.modality === modality &&
      model.supportsReferenceImage === options.referenceImage,
  );
}

export function selectableModelForInput(
  key: string,
  modality: GenerationModality,
  referenceImage: boolean,
): GenerationModelDefinition {
  const model = modelDefinitionForKey(key);
  if (
    !model ||
    model.status !== "verified" ||
    model.modality !== modality ||
    model.supportsReferenceImage !== referenceImage
  ) {
    throw new Error("The selected generation model is not available.");
  }
  return model;
}
