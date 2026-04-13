"use client";

import { useEffect, useState, useRef } from "react";
import { useVibes } from "./VibesProvider";

interface FloatingEmoji {
  id: number;
  emoji: string;
  x: number;  // horizontal position 10-90%
}

export function ReactionFloat() {
  const { latestEvent } = useVibes();
  const [floaters, setFloaters] = useState<FloatingEmoji[]>([]);
  const counter = useRef(0);

  useEffect(() => {
    if (!latestEvent || latestEvent.type !== "reaction") return;
    const id = ++counter.current;
    const x = Math.random() * 80 + 10;
    setFloaters((prev) => [...prev, { id, emoji: latestEvent.emoji, x }]);
    const timer = setTimeout(() => {
      setFloaters((prev) => prev.filter((f) => f.id !== id));
    }, 3000);
    return () => clearTimeout(timer);
  }, [latestEvent]);

  if (floaters.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        pointerEvents: 'none',
      }}
      aria-hidden="true"
    >
      {floaters.map(({ id, emoji, x }) => (
        <span
          key={id}
          style={{
            position: 'absolute',
            left: `${x}%`,
            bottom: '20%',
            fontSize: '2.25rem',
            userSelect: 'none',
            animation: 'float-up 3s ease-out forwards',
          }}
        >
          {emoji}
        </span>
      ))}
    </div>
  );
}
