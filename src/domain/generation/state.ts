export const generationStatuses = [
  "draft",
  "quoted",
  "reserving",
  "queued",
  "processing",
  "succeeded",
  "failed",
  "canceled",
  "expired",
  "reconciliation_required",
] as const;

export type GenerationStatus = (typeof generationStatuses)[number];

export type GenerationModality =
  "text_to_image" | "image_to_video" | "text_to_speech";

const allowedTransitions: Readonly<
  Record<GenerationStatus, readonly GenerationStatus[]>
> = {
  draft: ["quoted", "failed", "canceled", "expired"],
  quoted: ["reserving", "failed", "canceled", "expired"],
  reserving: ["queued", "failed", "canceled", "reconciliation_required"],
  queued: [
    "processing",
    "succeeded",
    "failed",
    "canceled",
    "expired",
    "reconciliation_required",
  ],
  processing: ["succeeded", "failed", "canceled", "reconciliation_required"],
  succeeded: [],
  failed: [],
  canceled: [],
  expired: [],
  reconciliation_required: [
    "queued",
    "processing",
    "succeeded",
    "failed",
    "canceled",
  ],
};

export class GenerationStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GenerationStateError";
  }
}

export function canTransitionGeneration(
  current: GenerationStatus,
  next: GenerationStatus,
): boolean {
  return current === next || allowedTransitions[current].includes(next);
}

export function assertGenerationTransition(input: {
  current: GenerationStatus;
  next: GenerationStatus;
  resultReference?: unknown;
}): void {
  if (!canTransitionGeneration(input.current, input.next)) {
    throw new GenerationStateError(
      `Invalid generation state transition: ${input.current} -> ${input.next}`,
    );
  }

  if (
    input.next === "succeeded" &&
    (input.resultReference === null || input.resultReference === undefined)
  ) {
    throw new GenerationStateError(
      "A succeeded generation requires a result reference.",
    );
  }
}
