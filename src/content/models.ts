export type ModelContent = Readonly<{
  modality: string;
  model: string;
  purpose: string;
  description: string;
}>;

export const modelContent = [
  {
    modality: "Text to Image",
    model: "fal.flux.schnell",
    purpose: "图片生成",
    description: "根据文本提示生成图片。",
  },
  {
    modality: "Image to Video",
    model: "fal.kling.v2_1.standard.image_to_video",
    purpose: "图片转视频",
    description: "将一张参考图片扩展为短视频。",
  },
  {
    modality: "Text to Speech",
    model: "fal.minimax.speech_02_hd",
    purpose: "文本转语音",
    description: "将提供的文本转换为音频。",
  },
] as const satisfies readonly ModelContent[];
