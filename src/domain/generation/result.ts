import type { GenerationModality } from "@/domain/generation/state";

export type GenerationResultAsset = Readonly<{
  url: string;
  contentType: "image" | "video" | "audio";
}>;

export function readGenerationResultAssets(
  value: unknown,
): readonly GenerationResultAsset[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return [];
  }

  const assets = (value as Record<string, unknown>).assets;
  if (!Array.isArray(assets)) {
    return [];
  }

  return assets.flatMap((asset) => {
    if (!asset || typeof asset !== "object" || Array.isArray(asset)) {
      return [];
    }

    const { contentType, url } = asset as Record<string, unknown>;
    if (
      (contentType !== "image" &&
        contentType !== "video" &&
        contentType !== "audio") ||
      typeof url !== "string"
    ) {
      return [];
    }

    try {
      const parsed = new URL(url);
      return parsed.protocol === "https:"
        ? [{ contentType, url: parsed.toString() }]
        : [];
    } catch {
      return [];
    }
  });
}

export function readGenerationPrompt(
  modality: GenerationModality,
  value: unknown,
): string | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  const input = value as Record<string, unknown>;
  const candidate = modality === "text_to_speech" ? input.text : input.prompt;
  return typeof candidate === "string" ? candidate : undefined;
}
