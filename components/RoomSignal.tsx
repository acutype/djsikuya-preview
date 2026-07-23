"use client";

import { useEffect } from "react";

export default function RoomSignal() {
  useEffect(() => {
    const root = document.documentElement;
    if (window.matchMedia("(max-width: 780px)").matches) {
      root.style.setProperty("--page-progress", "0");
      return;
    }
    let frame = 0;

    const updateProgress = () => {
      frame = 0;
      const range = document.documentElement.scrollHeight - window.innerHeight;
      const progress = range > 0 ? Math.min(1, Math.max(0, window.scrollY / range)) : 0;
      root.style.setProperty("--page-progress", progress.toFixed(4));
    };

    const requestProgress = () => {
      if (!frame) frame = window.requestAnimationFrame(updateProgress);
    };

    updateProgress();
    window.addEventListener("scroll", requestProgress, { passive: true });

    return () => {
      window.removeEventListener("scroll", requestProgress);
      if (frame) window.cancelAnimationFrame(frame);
      root.style.removeProperty("--page-progress");
    };
  }, []);

  return (
    <aside className="page-signal" aria-hidden="true">
      <span className="page-signal-track"><i /></span>
      <span>Room signal</span>
    </aside>
  );
}
