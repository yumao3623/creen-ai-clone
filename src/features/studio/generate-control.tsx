"use client";

/* eslint-disable @next/next/no-img-element -- Result URLs are runtime Provider URLs. */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import {
  BottomToolbar,
  PrimaryTabs,
  PromptEditor,
  WorkbenchShell,
} from "./workbench-parts";
import styles from "./generate-control.module.css";
import {
  defaultModelForModality,
  defaultModelKeys,
  modelDefinitionForKey,
  modelsForModality,
  type FalModelKey,
} from "@/domain/generation/model-registry";

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

export type ResultAsset = Readonly<{
  url: string;
  contentType: "image" | "video" | "audio";
}>;

export type ResultHistoryItem = Readonly<{
  id: string;
  modality: Modality;
  status: string;
  modelKey: string;
  prompt?: string;
  asset?: ResultAsset;
  createdAt: string;
  completedAt: string | null;
}>;

type GenerationTask = Readonly<{
  id: string;
  modality: Modality;
  status: string;
  modelKey: string;
  prompt?: string;
  resultAssets: readonly ResultAsset[];
  failureCode: string | null;
  completedAt: string | null;
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

function taskStatusLabel(status: string) {
  return (
    {
      failed: "生成失败",
      processing: "正在生成",
      queued: "等待生成",
      reconciliation_required: "正在对账",
      succeeded: "创作完成",
    }[status] ?? "任务状态更新中"
  );
}

function historyModalityLabel(modality: Modality) {
  return {
    text_to_image: "图片创作",
    image_to_video: "视频创作",
    text_to_speech: "音讯创作",
  }[modality];
}

function ResultHistorySidebar({
  history,
  taskId,
}: Readonly<{
  history: readonly ResultHistoryItem[];
  taskId: string | null;
}>) {
  return (
    <aside className={styles.historyRail} aria-label="我的创作历史">
      <Link className={styles.historyBack} href="/studio">
        <span aria-hidden="true">‹</span>
        <span className="sr-only">返回创作</span>
      </Link>
      <Link className={styles.historyCreate} href="/studio">
        <span aria-hidden="true">+</span>
        <span className="sr-only">新建创作</span>
      </Link>
      <div className={styles.historyList}>
        {history.map((item) => (
          <Link
            className={`${styles.historyItem} ${item.id === taskId ? styles.historyItemActive : ""}`}
            href={`/studio/result?task=${item.id}`}
            key={item.id}
          >
            <span className={styles.historyPreview}>
              {item.asset?.contentType === "image" ? (
                <img alt="" src={item.asset.url} />
              ) : item.asset?.contentType === "video" ? (
                <video muted preload="metadata" src={item.asset.url} />
              ) : (
                <span aria-hidden="true" className={styles.historyAudio}>
                  ◒
                </span>
              )}
            </span>
            <span className={styles.historyTooltip} role="tooltip">
              <strong>
                {item.prompt || historyModalityLabel(item.modality)}
              </strong>
              <time dateTime={item.createdAt}>
                {item.createdAt.slice(0, 10)}
              </time>
            </span>
          </Link>
        ))}
      </div>
    </aside>
  );
}

function ResultWorkspace({
  onReusePrompt,
  task,
}: {
  onReusePrompt: (task: GenerationTask) => void;
  task: GenerationTask;
}) {
  const hasAssets = task.resultAssets.length > 0;

  return (
    <section
      className={styles.resultWorkspace}
      aria-label="生成结果工作区"
      aria-live="polite"
      data-testid="result-workspace"
    >
      <div className={styles.resultWorkspaceHeading}>
        <div>
          <p className={styles.resultEyebrow}>本次创作</p>
          <h2>{taskStatusLabel(task.status)}</h2>
        </div>
      </div>
      {task.prompt ? (
        <div className={styles.resultPromptBlock}>
          <span className={styles.resultPromptLabel}>Prompt</span>
          <p className={styles.resultPrompt}>{task.prompt}</p>
        </div>
      ) : null}
      {task.status === "succeeded" && hasAssets ? (
        <div className={styles.resultAssets}>
          {task.resultAssets.map((asset) => (
            <figure key={asset.url}>
              <div className={styles.resultMediaStage}>
                {asset.contentType === "image" ? (
                  <img alt="本次生成的图片" src={asset.url} />
                ) : asset.contentType === "video" ? (
                  <video controls preload="metadata" src={asset.url}>
                    您的浏览器不支持视频播放。
                  </video>
                ) : (
                  <audio controls preload="metadata" src={asset.url}>
                    您的浏览器不支持音频播放。
                  </audio>
                )}
              </div>
              <figcaption>
                <span className={styles.resultModel} title={task.modelKey}>
                  {modelDefinitionForKey(task.modelKey)?.label ?? task.modelKey}
                </span>
                <div className={styles.resultActions}>
                  {task.prompt ? (
                    <button onClick={() => onReusePrompt(task)} type="button">
                      复用 Prompt
                    </button>
                  ) : null}
                  <a href={asset.url} rel="noreferrer" target="_blank">
                    打开原始结果
                  </a>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      ) : task.status === "failed" ? (
        <p className={styles.resultMessage}>
          {task.failureCode
            ? `提供方未完成此任务：${task.failureCode}`
            : "提供方未完成此任务。"}
        </p>
      ) : task.status === "succeeded" ? (
        <p className={styles.resultMessage}>
          任务已完成，但没有可安全展示的结果文件。
        </p>
      ) : (
        <p className={styles.resultMessage}>
          正在等待可信的 Provider 完成回调；此页面会自动更新。
        </p>
      )}
    </section>
  );
}

function messageFor(error: unknown) {
  return error instanceof Error
    ? error.message
    : "请求暂时无法完成，请稍后重试。";
}

export function GenerateControl({
  authenticated,
  history = [],
  resultRoute = false,
}: {
  authenticated: boolean;
  history?: readonly ResultHistoryItem[];
  resultRoute?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inputFile = useRef<HTMLInputElement>(null);
  const referenceInputFile = useRef<HTMLInputElement>(null);
  const submitLockRef = useRef(false);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const hydratedTaskId = useRef<string | undefined>(undefined);
  const [modality, setModality] = useState<Modality>("text_to_image");
  const [imagePrompt, setImagePrompt] = useState(defaultImagePrompt);
  const [imageSize, setImageSize] = useState("square");
  const [videoPrompt, setVideoPrompt] = useState(defaultVideoPrompt);
  const [videoDuration, setVideoDuration] = useState("5");
  const [inputUrl, setInputUrl] = useState<string>();
  const [inputPreviewUrl, setInputPreviewUrl] = useState<string>();
  const [referenceInputUrl, setReferenceInputUrl] = useState<string>();
  const [referencePreviewUrl, setReferencePreviewUrl] = useState<string>();
  const [speechText, setSpeechText] = useState("");
  const [voiceId, setVoiceId] = useState("");
  const [modelKeys, setModelKeys] = useState<Record<Modality, FalModelKey>>({
    ...defaultModelKeys,
  });
  const [quote, setQuote] = useState<Quote>();
  const [clientKey, setClientKey] = useState<string>();
  const [state, setState] = useState<
    "idle" | "quoting" | "submitting" | "queued" | "error" | "insufficient"
  >("idle");
  const [submitLocked, setSubmitLocked] = useState(false);
  const [message, setMessage] = useState<string>();
  const [currentTask, setCurrentTask] = useState<GenerationTask>();
  const [taskLoadMessage, setTaskLoadMessage] = useState<string>();
  const [taskLoadMessageTaskId, setTaskLoadMessageTaskId] = useState<string>();
  const taskId = searchParams.get("task");

  useEffect(() => {
    return () => {
      if (inputPreviewUrl) URL.revokeObjectURL(inputPreviewUrl);
      if (referencePreviewUrl) URL.revokeObjectURL(referencePreviewUrl);
    };
  }, [inputPreviewUrl, referencePreviewUrl]);

  useEffect(() => {
    if (!taskId || !authenticated) {
      return;
    }

    const requestedTaskId = taskId;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function loadTask() {
      try {
        const response = await fetch(`/api/generations/${requestedTaskId}`, {
          cache: "no-store",
        });
        if (response.status === 401) {
          router.push("/login?next=%2Fstudio");
          return;
        }
        if (!response.ok) {
          if (!cancelled) {
            setTaskLoadMessageTaskId(requestedTaskId);
            setTaskLoadMessage(
              response.status === 404
                ? "当前登录账号无法访问这项创作。请使用生成该任务的账号打开。"
                : "暂时无法读取这项创作，请稍后刷新重试。",
            );
          }
          return;
        }

        const result = (await response.json()) as { task?: GenerationTask };
        if (!result.task || cancelled) return;
        setCurrentTask(result.task);
        if (hydratedTaskId.current !== requestedTaskId) {
          hydratedTaskId.current = requestedTaskId;
          setModality(result.task.modality);
        }
        setTaskLoadMessage(undefined);
        setTaskLoadMessageTaskId(undefined);
        if (
          result.task.status !== "succeeded" &&
          result.task.status !== "failed" &&
          result.task.status !== "canceled"
        ) {
          timer = setTimeout(() => void loadTask(), 4_000);
        }
      } catch {
        if (!cancelled) {
          setTaskLoadMessageTaskId(requestedTaskId);
          setTaskLoadMessage("暂时无法读取这项创作，请稍后刷新重试。");
        }
      }
    }

    void loadTask();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [authenticated, router, taskId]);

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
    if (next !== "image_to_video") {
      setInputUrl(undefined);
      setInputPreviewUrl(undefined);
      if (inputFile.current) inputFile.current.value = "";
    }
    if (next !== "text_to_image") {
      setReferenceInputUrl(undefined);
      setReferencePreviewUrl(undefined);
      if (referenceInputFile.current) referenceInputFile.current.value = "";
      setModelKeys((current) => ({
        ...current,
        text_to_image: defaultModelKeys.text_to_image,
      }));
    }
    resetQuote();
  }

  function chooseModel(next: FalModelKey) {
    setModelKeys((current) => ({ ...current, [modality]: next }));
    resetQuote();
  }

  function reusePrompt(task: GenerationTask) {
    chooseMode(task.modality);
    if (task.modality === "text_to_image") {
      setImagePrompt(task.prompt ?? "");
    } else if (task.modality === "image_to_video") {
      setVideoPrompt(task.prompt ?? "");
      setInputUrl(undefined);
      setInputPreviewUrl(undefined);
      if (inputFile.current) inputFile.current.value = "";
    } else {
      setSpeechText(task.prompt ?? "");
    }

    window.requestAnimationFrame(() => {
      document
        .getElementById(`${task.modality}-panel`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
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

  async function uploadImageReference() {
    const file = referenceInputFile.current?.files?.[0];
    if (referenceInputUrl) return referenceInputUrl;
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
    setReferenceInputUrl(result.inputUrl);
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
          ...(referenceInputFile.current?.files?.length || referenceInputUrl
            ? { referenceImageUrl: await uploadImageReference() }
            : {}),
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
        body: JSON.stringify({
          modelKey: modelKeys[modality],
          input: preparedInput,
        }),
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
    if (submitLockRef.current || submitLocked) {
      return;
    }

    if (!authenticated) {
      router.push("/login?next=%2Fstudio");
      return;
    }

    submitLockRef.current = true;
    setSubmitLocked(true);
    let routedToResult = false;

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
          modelKey: modelKeys[modality],
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
      setQuote(undefined);
      setClientKey(undefined);
      setState("queued");
      setMessage(
        result.status === "reconciliation_required"
          ? "服务提供方已接受请求，任务正在对账。请稍后到任务记录查看可信状态。"
          : "任务已进入队列。可以安全离开，并在任务记录查看最终结果。",
      );
      routedToResult = true;
      router.replace(`/studio/result?task=${result.taskId}`);
    } catch (error) {
      setState("error");
      setMessage(messageFor(error));
    } finally {
      if (!routedToResult) {
        submitLockRef.current = false;
        setSubmitLocked(false);
      }
    }
  }

  const pending = submitLocked || state === "quoting" || state === "submitting";
  const selectedModel =
    modelDefinitionForKey(modelKeys[modality]) ??
    defaultModelForModality(modality);
  const previewCredits =
    modality === "image_to_video"
      ? (videoDuration === "10" ? 2 : 1) * selectedModel.previewCredits
      : modality === "text_to_speech"
        ? Math.max(1, Math.ceil(Array.from(speechText).length / 10)) *
          selectedModel.previewCredits
        : selectedModel.previewCredits;
  const imageModels = modelsForModality("text_to_image", {
    referenceImage: Boolean(
      referenceInputUrl || referenceInputFile.current?.files?.length,
    ),
  });
  const availableModels =
    modality === "text_to_image"
      ? imageModels
      : modelsForModality(modality, { referenceImage: false });

  return (
    <div className={resultRoute ? styles.resultRoute : undefined}>
      {resultRoute ? (
        <ResultHistorySidebar history={history} taskId={taskId} />
      ) : null}
      <div className={resultRoute ? styles.resultMain : undefined}>
        <WorkbenchShell activeMode={modality}>
          <PrimaryTabs
            activeMode={modality}
            modes={modes}
            onKeyDown={handleTabKeyDown}
            onSelect={chooseMode}
            tabRefs={tabRefs}
          />
          {taskId &&
          taskLoadMessageTaskId === taskId &&
          taskLoadMessage &&
          currentTask?.id !== taskId ? (
            <section className={styles.resultWorkspace} aria-live="polite">
              <div className={styles.resultWorkspaceHeading}>
                <div>
                  <p className={styles.resultEyebrow}>本次创作</p>
                  <h2>无法读取结果</h2>
                </div>
              </div>
              <p className={styles.resultMessage}>{taskLoadMessage}</p>
            </section>
          ) : null}
          {currentTask?.id === taskId ? (
            <ResultWorkspace onReusePrompt={reusePrompt} task={currentTask} />
          ) : null}
          <div
            aria-labelledby={`${modality}-tab`}
            className={styles.composer}
            id={`${modality}-panel`}
            role="tabpanel"
          >
            {modality === "text_to_image" ? (
              <div className={styles.inputRow}>
                {modelsForModality("text_to_image", { referenceImage: true })
                  .length > 0 ? (
                  <label
                    className={`${styles.uploadCard} ${styles.uploadInput} ${referencePreviewUrl || referenceInputUrl ? styles.uploadInputUploaded : ""}`}
                  >
                    <input
                      accept="image/jpeg,image/png,image/webp"
                      aria-label="图片参考图"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        setReferenceInputUrl(undefined);
                        setReferencePreviewUrl(
                          file ? URL.createObjectURL(file) : undefined,
                        );
                        if (file) {
                          const referenceModel = modelsForModality(
                            "text_to_image",
                            { referenceImage: true },
                          )[0];
                          if (referenceModel) {
                            setModelKeys((current) => ({
                              ...current,
                              text_to_image: referenceModel.key as FalModelKey,
                            }));
                          }
                        } else {
                          setModelKeys((current) => ({
                            ...current,
                            text_to_image: defaultModelKeys.text_to_image,
                          }));
                        }
                        resetQuote();
                      }}
                      ref={referenceInputFile}
                      type="file"
                    />
                    {referencePreviewUrl ? (
                      <img
                        alt=""
                        className={`${styles.uploadPreview} uploadPreview`}
                        src={referencePreviewUrl}
                      />
                    ) : (
                      <span
                        className={styles.uploadCardIcon}
                        aria-hidden="true"
                      >
                        +
                      </span>
                    )}
                    <span className={styles.uploadCardLabel}>
                      {referencePreviewUrl || referenceInputUrl
                        ? "已选择"
                        : "参考图"}
                    </span>
                  </label>
                ) : null}
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
                  className={`${styles.uploadCard} ${styles.uploadInput} ${inputPreviewUrl || inputUrl ? styles.uploadInputUploaded : ""}`}
                >
                  <input
                    accept="image/jpeg,image/png,image/webp"
                    aria-label="参考图片"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      setInputUrl(undefined);
                      setInputPreviewUrl(
                        file ? URL.createObjectURL(file) : undefined,
                      );
                      resetQuote();
                    }}
                    ref={inputFile}
                    type="file"
                  />
                  {inputPreviewUrl ? (
                    <img
                      alt=""
                      className={`${styles.uploadPreview} uploadPreview`}
                      src={inputPreviewUrl}
                    />
                  ) : (
                    <span className={styles.uploadCardIcon} aria-hidden="true">
                      +
                    </span>
                  )}
                  <span className={styles.uploadCardLabel}>
                    {inputPreviewUrl || inputUrl ? "已选择" : "图片"}
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
              disabled={pending}
              onGenerate={() => void submit()}
            >
              {modality === "text_to_image" ? (
                <>
                  <label className={styles.parameterPill}>
                    <span className="sr-only">图片模型</span>
                    <select
                      aria-label="图片模型"
                      onChange={(event) =>
                        chooseModel(event.target.value as FalModelKey)
                      }
                      value={modelKeys[modality]}
                    >
                      {availableModels.map((model) => (
                        <option
                          key={model.key}
                          title={model.description}
                          value={model.key}
                        >
                          {model.label}
                        </option>
                      ))}
                    </select>
                  </label>
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
                </>
              ) : null}
              {modality === "image_to_video" ? (
                <>
                  <label className={styles.parameterPill}>
                    <span className="sr-only">视频模型</span>
                    <select
                      aria-label="视频模型"
                      onChange={(event) =>
                        chooseModel(event.target.value as FalModelKey)
                      }
                      value={modelKeys[modality]}
                    >
                      {availableModels.map((model) => (
                        <option
                          key={model.key}
                          title={model.description}
                          value={model.key}
                        >
                          {model.label}
                        </option>
                      ))}
                    </select>
                  </label>
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
                <label
                  className={`${styles.parameterPill} ${styles.audioToolSelector}`}
                >
                  <span className="sr-only">音频工具</span>
                  <select aria-label="音频工具" defaultValue="text_to_speech">
                    <option value="text_to_speech">文字转语音</option>
                  </select>
                </label>
              ) : null}
              {modality === "text_to_speech" ? (
                <label className={styles.parameterPill}>
                  <span className="sr-only">音频模型</span>
                  <select
                    aria-label="音频模型"
                    onChange={(event) =>
                      chooseModel(event.target.value as FalModelKey)
                    }
                    value={modelKeys[modality]}
                  >
                    {availableModels.map((model) => (
                      <option
                        key={model.key}
                        title={model.description}
                        value={model.key}
                      >
                        {model.label}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              {modality === "text_to_speech" ? (
                <span
                  aria-label="默认声音 Wise_Woman"
                  className={`${styles.parameterPill} ${styles.audioDefaultVoice}`}
                >
                  默认声音：Wise_Woman
                </span>
              ) : null}
              {modality === "text_to_speech" ? (
                <label
                  className={`${styles.parameterPill} ${styles.voiceInput}`}
                >
                  <span className="sr-only">声音 ID（可选）</span>
                  <input
                    aria-label="声音 ID（可选）"
                    onChange={(event) => {
                      setVoiceId(event.target.value);
                      resetQuote();
                    }}
                    placeholder="Voice ID（可选）"
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
      </div>
    </div>
  );
}
