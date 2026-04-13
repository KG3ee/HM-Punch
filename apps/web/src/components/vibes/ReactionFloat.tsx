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
    <div className="pointer-events-none fixed inset-0 z-50" aria-hidden="true">
      {floaters.map(({ id, emoji, x }) => (
        <span
          key={id}
          className="absolute text-4xl animate-bounce select-none"
          style={{
            left: `${x}%`,
            bottom: "20%",
            animationDuration: "0.4s",
          }}
        >
          {emoji}
        </span>
      ))}
    </div>
  );
}
