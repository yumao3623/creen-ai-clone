"use client";

import Image from "next/image";

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
    <>
      <section className="home-inspiration" aria-labelledby="inspiration-title">
        <div className="section-heading home-inspiration__heading">
          <p className="eyebrow">探索灵感</p>
          <h2 id="inspiration-title">从一个画面开始</h2>
          <p>图片与视频灵感，直接带回创作台继续调整。</p>
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
                <button onClick={() => applyInspiration(item)} type="button">
                  制作相似内容
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
