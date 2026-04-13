"use client";

import { useEffect, useState, useRef } from "react";
import { useVibes } from "./VibesProvider";

interface Banner {
  id: number;
  text: string;
}

export function BubbleBanner() {
  const { latestEvent } = useVibes();
  const [banners, setBanners] = useState<Banner[]>([]);
  const counter = useRef(0);

  useEffect(() => {
    if (!latestEvent || latestEvent.type !== "bubble") return;
    const id = ++counter.current;
    setBanners((prev) => [...prev, { id, text: latestEvent.text }]);
    const timer = setTimeout(() => {
      setBanners((prev) => prev.filter((b) => b.id !== id));
    }, 60_000);
    return () => clearTimeout(timer);
  }, [latestEvent]);

  if (banners.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 items-center"
      aria-live="polite"
    >
      {banners.map(({ id, text }) => (
        <div
          key={id}
          className="bg-base-300 text-base-content px-4 py-2 rounded-full shadow-lg text-sm max-w-xs text-center"
        >
          📢 {text}
        </div>
      ))}
    </div>
  );
}
