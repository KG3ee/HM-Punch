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
      style={{
        position: 'fixed',
        bottom: '2rem',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        alignItems: 'center',
        pointerEvents: 'none',
      }}
      aria-live="polite"
    >
      {banners.map(({ id, text }) => (
        <div
          key={id}
          style={{
            background: 'var(--card-elevated)',
            color: 'var(--foreground)',
            padding: '0.5rem 1rem',
            borderRadius: '9999px',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
            fontSize: '0.875rem',
            maxWidth: '20rem',
            textAlign: 'center',
            border: '1px solid var(--line)',
            pointerEvents: 'auto',
          }}
        >
          📢 {text}
        </div>
      ))}
    </div>
  );
}
