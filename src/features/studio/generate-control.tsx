"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Modality = "text_to_image" | "image_to_video" | "text_to_speech";

type Quote = Readonly<{
  quoteId: string;
  creditsCost: number;
  expiresAt: string;
}>;

type ApiResult = Readonly<{
  quote?: Quote;
  taskId?: string;
  status?: string;
  inputUrl?: string;
  error?: Readonly<{ code?: string; message?: string }>;
}>;

const modes = [
  ["text_to_image", "图片", "文本生成图片"],
  ["image_to_video", "视频", "图片生成视频"],
  ["text_to_speech", "语音", "文本生成语音"],
] as const;

const defaultImagePrompt = "柔和绿光照亮的安静未来创作工作室";

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
  const [videoPrompt, setVideoPrompt] = useState("镜头缓慢穿过画面中的场景");
  const [videoDuration, setVideoDuration] = useState("5");
  const [inputUrl, setInputUrl] = useState<string>();
  const [speechText, setSpeechText] =
    useState("欢迎来到更安静、更专注的创作方式。");
  const [voiceId, setVoiceId] = useState("");
  const [quote, setQuote] = useState<Quote>();
  const [clientKey, setClientKey] = useState<string>();
  const [state, setState] = useState<
    "idle" | "quoting" | "submitting" | "queued" | "error" | "insufficient"
  >("idle");
  const [message, setMessage] = useState<string>();

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
    const nextMode = modes[nextIndex]![0];
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

  async function requestQuote() {
    if (!authenticated) {
      router.push("/login?next=%2Fstudio");
      return;
    }

    setState("quoting");
    setMessage(undefined);
    try {
      const generationInput = await input();
      const response = await fetch("/api/quotes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(generationInput),
      });
      const result = await readResult(response);
      if (response.status === 401) {
        router.push("/login?next=%2Fstudio");
        return;
      }
      if (!response.ok || !result.quote) {
        throw new Error("暂时无法获取确定报价，请稍后重试。");
      }
      setQuote(result.quote);
      setClientKey(crypto.randomUUID());
      setState("idle");
      setMessage(
        `报价已锁定：${result.quote.creditsCost} Credits，15 分钟内有效。`,
      );
    } catch (error) {
      setState("error");
      setMessage(messageFor(error));
    }
  }

  async function submit() {
    if (!quote || !clientKey) {
      await requestQuote();
      return;
    }

    setState("submitting");
    setMessage(undefined);
    try {
      const generationInput = await input();
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          clientKey,
          quoteId: quote.quoteId,
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

  return (
    <div className="studio-workbench">
      <div className="studio-mode-tabs" role="tablist" aria-label="创作模式">
        {modes.map(([value, label, description], index) => (
          <button
            aria-controls={`${value}-panel`}
            aria-selected={modality === value}
            className={modality === value ? "is-active" : undefined}
            key={value}
            onClick={() => chooseMode(value)}
            onKeyDown={(event) => handleTabKeyDown(event, index)}
            ref={(element) => {
              tabRefs.current[index] = element;
            }}
            role="tab"
            id={`${value}-tab`}
            tabIndex={modality === value ? 0 : -1}
            type="button"
          >
            <span>{label}</span>
            <small>{description}</small>
          </button>
        ))}
      </div>

      <div
        aria-labelledby={`${modality}-tab`}
        className="studio-composer"
        id={`${modality}-panel`}
        role="tabpanel"
      >
        {modality === "text_to_image" ? (
          <>
            <label className="field studio-prompt">
              <span>描述图片</span>
              <textarea
                onChange={(event) => {
                  setImagePrompt(event.target.value);
                  resetQuote();
                }}
                rows={7}
                value={imagePrompt}
              />
            </label>
            <label className="field">
              <span>图像尺寸</span>
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
          </>
        ) : null}
        {modality === "image_to_video" ? (
          <>
            <label className="field">
              <span>参考图片</span>
              <input
                accept="image/jpeg,image/png,image/webp"
                onChange={() => {
                  setInputUrl(undefined);
                  resetQuote();
                }}
                ref={inputFile}
                type="file"
              />
              <small>
                {inputUrl
                  ? "图片已安全上传，可用于本次请求。"
                  : "支持 PNG、JPG、WebP，最大 10 MB。"}
              </small>
            </label>
            <label className="field studio-prompt">
              <span>描述视频</span>
              <textarea
                onChange={(event) => {
                  setVideoPrompt(event.target.value);
                  resetQuote();
                }}
                rows={5}
                value={videoPrompt}
              />
            </label>
            <fieldset className="duration-control">
              <legend>视频时长</legend>
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
          <>
            <label className="field studio-prompt">
              <span>需要朗读的文本</span>
              <textarea
                onChange={(event) => {
                  setSpeechText(event.target.value);
                  resetQuote();
                }}
                rows={7}
                value={speechText}
              />
              <small>按每 10 个字符计算 Credits。</small>
            </label>
            <label className="field">
              <span>声音标识（可选）</span>
              <input
                onChange={(event) => {
                  setVoiceId(event.target.value);
                  resetQuote();
                }}
                placeholder="voice-id"
                value={voiceId}
              />
            </label>
          </>
        ) : null}
      </div>

      <aside className="studio-result" aria-live="polite">
        <p className="eyebrow">生成状态</p>
        <h2>{state === "queued" ? "任务已提交" : "准备开始创作"}</h2>
        <p>{message ?? "获取报价后，系统才会允许创建任务并预留 Credits。"}</p>
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

      <div className="studio-submit">
        <p>
          {quote ? `确定报价：${quote.creditsCost} Credits` : "尚未获取报价"}
        </p>
        <div>
          <button
            className="button button--secondary"
            disabled={pending}
            onClick={() => void requestQuote()}
            type="button"
          >
            {pending
              ? "正在处理..."
              : authenticated
                ? "获取报价"
                : "登录后获取报价"}
          </button>
          <button
            className="button button--primary"
            disabled={pending || !quote || state === "queued"}
            onClick={() => void submit()}
            type="button"
          >
            {state === "submitting"
              ? "正在提交..."
              : quote
                ? `生成 · ${quote.creditsCost}`
                : "生成"}
          </button>
        </div>
      </div>
    </div>
  );
}
