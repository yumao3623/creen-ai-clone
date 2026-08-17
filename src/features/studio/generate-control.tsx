"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import {
  BottomToolbar,
  PrimaryTabs,
  PromptEditor,
  UploadCard,
  WorkbenchShell,
} from "./workbench-parts";
import styles from "./generate-control.module.css";

type Modality = "text_to_image" | "image_to_video" | "text_to_speech";

type Quote = Readonly<{
  quoteId: string;
  creditsCost: number;
  expiresAt: string;
}>;

type QuoteSession = Readonly<{
  clientKey: string;
  quote: Quote;
}>;

type ApiResult = Readonly<{
  quote?: Quote;
  taskId?: string;
  status?: string;
  inputUrl?: string;
  error?: Readonly<{ code?: string; message?: string }>;
}>;

type InspirationEvent = Readonly<{
  modality: "text_to_image" | "image_to_video";
  prompt: string;
}>;

const modes = [
  {
    value: "text_to_image",
    label: "图片",
    description: "文本生成图片",
    icon: "▣",
  },
  {
    value: "image_to_video",
    label: "视频",
    description: "图片生成视频",
    icon: "▰",
  },
  {
    value: "text_to_speech",
    label: "音讯",
    description: "文本生成语音",
    icon: "◒",
  },
] as const;

const defaultImagePrompt = "";
const defaultVideoPrompt = "";

function messageFor(error: unknown) {
  return error instanceof Error
    ? error.message
    : "请求暂时无法完成，请稍后重试。";
}

export function GenerateControl({ authenticated }: { authenticated: boolean }) {
  const router = useRouter();
  const inputFile = useRef<HTMLInputElement>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [modality, setModality] = useState<Modality>("text_to_image");
  const [imagePrompt, setImagePrompt] = useState(defaultImagePrompt);
  const [imageSize, setImageSize] = useState("square");
  const [videoPrompt, setVideoPrompt] = useState(defaultVideoPrompt);
  const [videoDuration, setVideoDuration] = useState("5");
  const [inputUrl, setInputUrl] = useState<string>();
  const [speechText, setSpeechText] = useState("");
  const [voiceId, setVoiceId] = useState("");
  const [quote, setQuote] = useState<Quote>();
  const [clientKey, setClientKey] = useState<string>();
  const [state, setState] = useState<
    "idle" | "quoting" | "submitting" | "queued" | "error" | "insufficient"
  >("idle");
  const [message, setMessage] = useState<string>();

  useEffect(() => {
    function applyInspiration(event: Event) {
      const detail = (event as CustomEvent<InspirationEvent>).detail;
      if (!detail?.prompt) return;

      setModality(detail.modality);
      if (detail.modality === "text_to_image") {
        setImagePrompt(detail.prompt);
      } else {
        setVideoPrompt(detail.prompt);
      }
      resetQuote();
    }

    window.addEventListener("creen:apply-inspiration", applyInspiration);
    return () =>
      window.removeEventListener("creen:apply-inspiration", applyInspiration);
  }, []);

  function resetQuote() {
    setQuote(undefined);
    setClientKey(undefined);
    setState("idle");
    setMessage(undefined);
  }

  function chooseMode(next: Modality) {
    setModality(next);
    resetQuote();
  }

  function handleTabKeyDown(
    event: React.KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
    const lastIndex = modes.length - 1;
    let nextIndex: number | undefined;

    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        nextIndex = index === lastIndex ? 0 : index + 1;
        break;
      case "ArrowLeft":
      case "ArrowUp":
        nextIndex = index === 0 ? lastIndex : index - 1;
        break;
      case "Home":
        nextIndex = 0;
        break;
      case "End":
        nextIndex = lastIndex;
        break;
      default:
        return;
    }

    event.preventDefault();
    const nextMode = modes[nextIndex]!.value;
    chooseMode(nextMode);
    tabRefs.current[nextIndex]?.focus();
  }

  async function readResult(response: Response): Promise<ApiResult> {
    return (await response.json()) as ApiResult;
  }

  async function uploadVideoReference() {
    const file = inputFile.current?.files?.[0];
    if (inputUrl) return inputUrl;
    if (!file) throw new Error("请先选择一张 PNG、JPG 或 WebP 图片。");

    const body = new FormData();
    body.set("image", file);
    const response = await fetch("/api/uploads/image", {
      method: "POST",
      body,
    });
    const result = await readResult(response);
    if (response.status === 401) {
      router.push("/login?next=%2Fstudio");
      throw new Error("需要登录后才能上传参考图片。");
    }
    if (!response.ok || !result.inputUrl) {
      throw new Error("参考图片暂时无法上传，请检查格式与大小后重试。");
    }
    setInputUrl(result.inputUrl);
    return result.inputUrl;
  }

  async function input() {
    switch (modality) {
      case "text_to_image":
        if (!imagePrompt.trim()) throw new Error("请先输入图片描述。");
        return {
          modality,
          prompt: imagePrompt,
          imageSize: imageSize as
            "square" | "square_hd" | "portrait_4_3" | "landscape_4_3",
        } as const;
      case "image_to_video":
        if (!videoPrompt.trim())
          throw new Error("请先描述视频中的运动或场景。");
        return {
          modality,
          imageUrl: await uploadVideoReference(),
          prompt: videoPrompt,
          duration: videoDuration as "5" | "10",
        } as const;
      case "text_to_speech":
        if (!speechText.trim()) throw new Error("请先输入需要朗读的文本。");
        return {
          modality,
          text: speechText,
          ...(voiceId.trim() ? { voiceId: voiceId.trim() } : {}),
        } as const;
    }
  }

  async function requestQuote(
    generationInput?: unknown,
  ): Promise<QuoteSession | undefined> {
    if (!authenticated) {
      router.push("/login?next=%2Fstudio");
      return undefined;
    }

    setState("quoting");
    setMessage(undefined);
    try {
      const preparedInput = generationInput ?? (await input());
      const response = await fetch("/api/quotes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(preparedInput),
      });
      const result = await readResult(response);
      if (response.status === 401) {
        router.push("/login?next=%2Fstudio");
        return undefined;
      }
      if (!response.ok || !result.quote) {
        throw new Error("暂时无法获取确定报价，请稍后重试。");
      }
      setQuote(result.quote);
      const nextClientKey = crypto.randomUUID();
      setClientKey(nextClientKey);
      setState("idle");
      setMessage("已准备好，可以直接生成。");
      return { clientKey: nextClientKey, quote: result.quote };
    } catch (error) {
      setState("error");
      setMessage(messageFor(error));
      return undefined;
    }
  }

  async function submit() {
    if (!authenticated) {
      router.push("/login?next=%2Fstudio");
      return;
    }

    try {
      const generationInput = await input();
      const session =
        quote && clientKey
          ? { quote, clientKey }
          : await requestQuote(generationInput);
      if (!session) return;

      setState("submitting");
      setMessage(undefined);
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          clientKey: session.clientKey,
          quoteId: session.quote.quoteId,
          input: generationInput,
        }),
      });
      const result = await readResult(response);
      if (response.status === 401) {
        router.push("/login?next=%2Fstudio");
        return;
      }
      if (result.error?.code === "insufficient_credits") {
        setState("insufficient");
        setMessage(
          "可用 Credits 不足，真实生成未提交。请在账户页补充 Credits 后再试。",
        );
        return;
      }
      if (!response.ok || !result.taskId) {
        throw new Error(result.error?.message ?? "请求未完成，请稍后重试。");
      }
      setState("queued");
      setMessage(
        result.status === "reconciliation_required"
          ? "服务提供方已接受请求，任务正在对账。请稍后到任务记录查看可信状态。"
          : "任务已进入队列。可以安全离开，并在任务记录查看最终结果。",
      );
    } catch (error) {
      setState("error");
      setMessage(messageFor(error));
    }
  }

  const pending = state === "quoting" || state === "submitting";
  const previewCredits =
    modality === "text_to_image"
      ? 30
      : modality === "image_to_video"
        ? videoDuration === "10"
          ? 5_600
          : 2_800
        : Math.max(1, Math.ceil(Array.from(speechText).length / 10)) * 6;

  return (
    <WorkbenchShell activeMode={modality}>
      <PrimaryTabs
        activeMode={modality}
        modes={modes}
        onKeyDown={handleTabKeyDown}
        onSelect={chooseMode}
        tabRefs={tabRefs}
      />
      <div
        aria-labelledby={`${modality}-tab`}
        className={styles.composer}
        id={`${modality}-panel`}
        role="tabpanel"
      >
        {modality === "text_to_image" ? (
          <div className={styles.inputRow}>
            <UploadCard label="图片" />
            <PromptEditor
              ariaLabel="描述图片"
              onChange={(value) => {
                setImagePrompt(value);
                resetQuote();
              }}
              placeholder="描述您想创作的内容"
              rows={7}
              value={imagePrompt}
            />
          </div>
        ) : null}
        {modality === "image_to_video" ? (
          <div className={styles.inputRow}>
            <label
              className={`${styles.uploadCard} ${styles.uploadInput} ${inputUrl ? styles.uploadInputUploaded : ""}`}
            >
              <input
                accept="image/jpeg,image/png,image/webp"
                aria-label="参考图片"
                onChange={() => {
                  setInputUrl(undefined);
                  resetQuote();
                }}
                ref={inputFile}
                type="file"
              />
              <span className={styles.uploadCardIcon} aria-hidden="true">
                +
              </span>
              <span className={styles.uploadCardLabel}>
                {inputUrl ? "已上传" : "图片"}
              </span>
            </label>
            <PromptEditor
              ariaLabel="描述视频"
              onChange={(value) => {
                setVideoPrompt(value);
                resetQuote();
              }}
              placeholder="描述镜头中的动作与变化"
              rows={5}
              value={videoPrompt}
            />
          </div>
        ) : null}
        {modality === "text_to_speech" ? (
          <div className={styles.inputRow}>
            <UploadCard label="音频" />
            <PromptEditor
              ariaLabel="需要朗读的文本"
              onChange={(value) => {
                setSpeechText(value);
                resetQuote();
              }}
              placeholder="输入你想要朗读的内容..."
              rows={7}
              value={speechText}
            />
          </div>
        ) : null}

        <BottomToolbar
          credits={previewCredits}
          disabled={pending || state === "queued"}
          onGenerate={() => void submit()}
        >
          {modality === "text_to_image" ? (
            <label className={styles.parameterPill}>
              <span className="sr-only">图像尺寸</span>
              <select
                onChange={(event) => {
                  setImageSize(event.target.value);
                  resetQuote();
                }}
                value={imageSize}
              >
                <option value="square">方形</option>
                <option value="square_hd">高清方形</option>
                <option value="portrait_4_3">竖版 4:3</option>
                <option value="landscape_4_3">横版 4:3</option>
              </select>
            </label>
          ) : null}
          {modality === "image_to_video" ? (
            <>
              <span className={styles.parameterPill}>Kling 2.1</span>
              <fieldset className={styles.durationControl}>
                <legend className="sr-only">视频时长</legend>
                <label>
                  <input
                    checked={videoDuration === "5"}
                    name="duration"
                    onChange={() => {
                      setVideoDuration("5");
                      resetQuote();
                    }}
                    type="radio"
                  />
                  5 秒
                </label>
                <label>
                  <input
                    checked={videoDuration === "10"}
                    name="duration"
                    onChange={() => {
                      setVideoDuration("10");
                      resetQuote();
                    }}
                    type="radio"
                  />
                  10 秒
                </label>
              </fieldset>
            </>
          ) : null}
          {modality === "text_to_speech" ? (
            <label className={`${styles.parameterPill} ${styles.voiceInput}`}>
              <span className="sr-only">声音标识（可选）</span>
              <input
                onChange={(event) => {
                  setVoiceId(event.target.value);
                  resetQuote();
                }}
                placeholder="文字转语音"
                value={voiceId}
              />
            </label>
          ) : null}
        </BottomToolbar>
      </div>
      <aside
        className={`${styles.result}${message ? ` ${styles.resultVisible}` : ""}`}
        aria-live="polite"
      >
        <p className={styles.resultEyebrow}>生成状态</p>
        <h2>{state === "queued" ? "任务已提交" : "准备开始创作"}</h2>
        <p>{message ?? "输入完成后即可开始生成。"}</p>
        {state === "insufficient" ? (
          <button
            className="button button--secondary"
            onClick={() => router.push("/account")}
            type="button"
          >
            前往账户
          </button>
        ) : null}
      </aside>
    </WorkbenchShell>
  );
}
