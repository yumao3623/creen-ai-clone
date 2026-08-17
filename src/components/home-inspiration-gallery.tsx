"use client";

import Image from "next/image";
import { useState } from "react";

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
  const [activeKind, setActiveKind] = useState<Inspiration["kind"]>("video");
  const visibleInspirations = inspirations.filter(
    (item) => item.kind === activeKind,
  );

  function applyInspiration(item: Inspiration) {
    window.dispatchEvent(
      new CustomEvent("creen:apply-inspiration", {
        detail: { modality: item.modality, prompt: item.prompt },
      }),
    );
    document.querySelector(".home-creator")?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }

  return (
    <section className="home-inspiration" aria-label="创作灵感">
      <div className="home-inspiration__filters" aria-label="灵感分类">
        <button
          aria-pressed={activeKind === "video"}
          className={activeKind === "video" ? "is-active" : undefined}
          onClick={() => setActiveKind("video")}
          type="button"
        >
          <span aria-hidden="true">▰</span>
          影片
        </button>
        <button
          aria-pressed={activeKind === "image"}
          className={activeKind === "image" ? "is-active" : undefined}
          onClick={() => setActiveKind("image")}
          type="button"
        >
          <span aria-hidden="true">▣</span>
          图片
        </button>
      </div>
      <div className="home-inspiration__grid" data-kind={activeKind}>
        {visibleInspirations.map((item) => (
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
              <button onClick={() => applyInspiration(item)} type="button">
                制作相似内容
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
