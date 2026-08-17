"use client";

import Image from "next/image";
import { useRef, useState } from "react";

import homeGallery from "@/content/home-gallery.json";

type Modality = "text_to_image" | "image_to_video";

type Inspiration = Readonly<{
  alt: string;
  credits: number;
  id: string;
  kind: "image" | "video";
  modality: Modality;
  poster?: string;
  prompt: string;
  src: string;
}>;

const inspirations: ReadonlyArray<Inspiration> = [
  ...homeGallery.images.map((item) => ({
    ...item,
    kind: "image" as const,
    modality: "text_to_image" as const,
  })),
  ...homeGallery.videos.map((item) => ({
    ...item,
    kind: "video" as const,
    modality: "image_to_video" as const,
  })),
];

export function HomeInspirationGallery() {
  const dialog = useRef<HTMLDialogElement>(null);
  const [selected, setSelected] = useState<Inspiration>(inspirations[0]!);

  function openDetails(item: Inspiration) {
    setSelected(item);
    dialog.current?.showModal();
  }

  function applyInspiration() {
    window.dispatchEvent(
      new CustomEvent("creen:apply-inspiration", {
        detail: { modality: selected.modality, prompt: selected.prompt },
      }),
    );
    dialog.current?.close();
    document.querySelector(".home-creator")?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }

  return (
    <>
      <section className="home-inspiration" aria-labelledby="inspiration-title">
        <div className="section-heading home-inspiration__heading">
          <p className="eyebrow">探索灵感</p>
          <h2 id="inspiration-title">从一个画面开始</h2>
          <p>悬停查看参考提示词，或将它带回创作台继续调整。</p>
        </div>
        <div className="home-inspiration__filters" aria-label="素材类型">
          <span>全部</span>
          <span>图片</span>
          <span>视频</span>
        </div>
        <div className="home-inspiration__grid">
          {inspirations.map((item) => (
            <article
              className={`home-inspiration__item home-inspiration__item--${item.kind}`}
              key={item.id}
            >
              {item.kind === "video" ? (
                <video
                  aria-label={item.alt}
                  autoPlay
                  loop
                  muted
                  playsInline
                  poster={item.poster}
                  preload="metadata"
                  src={item.src}
                />
              ) : (
                <Image
                  alt={item.alt}
                  fill
                  sizes="(max-width: 48rem) 50vw, 25vw"
                  src={item.src}
                />
              )}
              <div className="home-inspiration__overlay">
                <span>{item.kind === "video" ? "视频灵感" : "图片灵感"}</span>
                <button onClick={() => openDetails(item)} type="button">
                  制作相似内容
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <dialog className="inspiration-dialog" ref={dialog}>
        <form method="dialog">
          <button
            aria-label="关闭提示词"
            className="inspiration-dialog__close"
            type="submit"
          >
            ×
          </button>
        </form>
        <p className="eyebrow">参考提示词</p>
        <h2>{selected.alt}</h2>
        <p>{selected.prompt}</p>
        <div className="inspiration-dialog__meta">
          <span>
            {selected.kind === "video" ? "图片生成视频" : "文本生成图片"}
          </span>
          <strong>
            参考 {selected.credits.toLocaleString("zh-CN")} Credits
          </strong>
        </div>
        {selected.kind === "video" ? (
          <p className="inspiration-dialog__note">
            会填入视频描述；提交前还需在创作台上传一张参考图片。
          </p>
        ) : null}
        <button
          className="button button--primary"
          onClick={applyInspiration}
          type="button"
        >
          填入创作台
        </button>
      </dialog>
    </>
  );
}
