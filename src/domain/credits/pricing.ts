import type { GenerationInput } from "@/domain/generation/modality-contract";

export const creditPricingBasis = {
  creditValueUsdMicrounits: 100,
  textToImageCredits: 30,
  videoFiveSecondCredits: 2_800,
  videoTenSecondCredits: 5_600,
  speechCreditsPerTenCharacters: 6,
} as const;

export type CreditPrice = Readonly<{
  parameterKey: "default" | "duration_5" | "duration_10" | "characters_10";
  credits: number;
}>;

export function frozenCreditPrice(input: GenerationInput): CreditPrice {
  switch (input.modality) {
    case "text_to_image":
      return {
        parameterKey: "default",
        credits: creditPricingBasis.textToImageCredits,
      };
    case "image_to_video":
      return input.duration === "10"
        ? {
            parameterKey: "duration_10",
            credits: creditPricingBasis.videoTenSecondCredits,
          }
        : {
            parameterKey: "duration_5",
            credits: creditPricingBasis.videoFiveSecondCredits,
          };
    case "text_to_speech":
      return {
        parameterKey: "characters_10",
        credits:
          Math.max(1, Math.ceil(Array.from(input.text).length / 10)) *
          creditPricingBasis.speechCreditsPerTenCharacters,
      };
  }
}
