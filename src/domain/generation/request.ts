import { createHash } from "node:crypto";

import type { GenerationModality } from "@/domain/generation/state";

export type JsonValue =
  | null
  | boolean
  | number
  | string
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue };

export type GenerationRequestHashInput = Readonly<{
  modality: GenerationModality;
  modelKey: string;
  normalizedInput: JsonValue;
  quoteId: string;
}>;

function canonicalJson(value: JsonValue): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }

  const record = value as { readonly [key: string]: JsonValue };
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key]!)}`)
    .join(",")}}`;
}

export function hashGenerationRequest(
  input: GenerationRequestHashInput,
): string {
  return createHash("sha256").update(canonicalJson(input)).digest("hex");
}
