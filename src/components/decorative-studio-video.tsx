"use client";

import { useEffect, useRef } from "react";

export function DecorativeStudioVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncPlayback = () => {
      const video = videoRef.current;
      if (!video) return;

      if (motionQuery.matches) {
        video.pause();
        return;
      }

      void video.play().catch(() => undefined);
    };

    syncPlayback();
    motionQuery.addEventListener("change", syncPlayback);
    return () => motionQuery.removeEventListener("change", syncPlayback);
  }, []);

  return (
    <video
      aria-hidden="true"
      autoPlay
      className="hero__media-video"
      loop
      muted
      playsInline
      poster="/media/phase11-studio.jpg"
      preload="metadata"
      ref={videoRef}
    >
      <source src="/media/phase11-studio.mp4" type="video/mp4" />
    </video>
  );
}
