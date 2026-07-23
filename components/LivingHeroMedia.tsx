"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

type NavigatorWithConnection = Navigator & { connection?: { saveData?: boolean } };

export default function LivingHeroMedia() {
  const [motionAvailable, setMotionAvailable] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [playRequested, setPlayRequested] = useState(false);
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
    const connection = (navigator as NavigatorWithConnection).connection;
    const allowed = !reducedMotion && !connection?.saveData;
    setMotionAvailable(allowed);
    setShowVideo(allowed && !coarsePointer);
  }, []);

  useEffect(() => {
    if (!showVideo || !playRequested) return;
    videoRef.current?.play().catch(() => undefined);
    setPlayRequested(false);
  }, [playRequested, showVideo]);

  async function togglePlayback() {
    const video = videoRef.current;
    if (!showVideo) {
      setPlayRequested(true);
      setShowVideo(true);
      return;
    }
    if (!video) return;
    if (video.paused) {
      await video.play().catch(() => undefined);
    } else {
      video.pause();
    }
  }

  return (
    <>
      <Image
        className="hero-portrait"
        src="/assets/dj-kuya-03.webp"
        alt="Sikuya performing behind the decks in a warm venue"
        fill
        priority
        sizes="(max-width: 780px) 100vw, 54vw"
      />
      {showVideo ? (
        <video
          id="hero-motion"
          ref={videoRef}
          className="hero-motion"
          autoPlay={!playRequested}
          muted
          loop
          playsInline
          preload="metadata"
          poster="/video/hero-loop-poster.webp"
          aria-hidden="true"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
        >
          <source src="/video/hero-loop.mp4" type="video/mp4" />
        </video>
      ) : null}
      {motionAvailable ? (
        <button className="hero-motion-toggle" type="button" onClick={togglePlayback} aria-controls={showVideo ? "hero-motion" : undefined} aria-pressed={playing}>
          {playing ? "Pause motion" : "Play motion"}
        </button>
      ) : null}
    </>
  );
}
