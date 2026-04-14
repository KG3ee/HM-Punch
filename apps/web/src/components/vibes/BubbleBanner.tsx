"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useVibes } from "./VibesProvider";

interface Bubble {
  id: number;
  text: string;
  /** Random horizontal start position (5–90% of viewport) */
  x: number;
  /** Random horizontal drift during float (-120 to 120px) */
  driftX: number;
  /** Animation duration in seconds (4.5–6) */
  duration: number;
  /** Delay before the pop burst (duration - 0.4s) */
  popAt: number;
  /** Whether the bubble is in its "popping" phase */
  popping: boolean;
  /** Hue for the bubble tint (0–360) */
  hue: number;
}

const BUBBLE_LIFETIME_BASE = 9; // seconds minimum
const BUBBLE_LIFETIME_JITTER = 2; // up to this many extra seconds (9–11s total)
const POP_DURATION = 0.4; // seconds for the pop/burst animation

/** Map text length → bubble diameter (rem). Short text = small, long text = big. */
function bubbleSize(len: number): number {
  const MIN_SIZE = 5.5;
  const MAX_SIZE = 10;
  const MIN_LEN = 5;
  const MAX_LEN = 70;
  const t = Math.min(Math.max((len - MIN_LEN) / (MAX_LEN - MIN_LEN), 0), 1);
  return MIN_SIZE + t * (MAX_SIZE - MIN_SIZE);
}

export function BubbleBanner() {
  const { latestEvent } = useVibes();
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const counter = useRef(0);

  const removeBubble = useCallback((id: number) => {
    setBubbles((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const popBubble = useCallback((id: number) => {
    setBubbles((prev) =>
      prev.map((b) => (b.id === id && !b.popping ? { ...b, popping: true } : b))
    );
    // Remove after pop animation finishes
    setTimeout(() => removeBubble(id), POP_DURATION * 1000);
  }, [removeBubble]);

  useEffect(() => {
    if (!latestEvent || latestEvent.type !== "bubble") return;
    const id = ++counter.current;
    const duration = BUBBLE_LIFETIME_BASE + Math.random() * BUBBLE_LIFETIME_JITTER;
    const popAt = duration - POP_DURATION;

    const bubble: Bubble = {
      id,
      text: latestEvent.text,
      x: 5 + Math.random() * 85,
      driftX: (Math.random() - 0.5) * 240,
      duration,
      popAt,
      popping: false,
      hue: Math.floor(Math.random() * 360),
    };

    setBubbles((prev) => [...prev, bubble]);

    // Start pop animation near end of life
    const popTimer = setTimeout(() => popBubble(id), popAt * 1000);

    return () => {
      clearTimeout(popTimer);
    };
  }, [latestEvent, popBubble]);

  if (bubbles.length === 0) return null;

  return (
    <div className="bubble-ocean" aria-live="polite">
      {bubbles.map((b) => (
        <div
          key={b.id}
          className={`bubble-float ${b.popping ? "bubble-pop" : ""}`}
          style={{
            left: `${b.x}%`,
            "--drift-x": `${b.driftX}px`,
            "--float-duration": `${b.duration}s`,
            "--bubble-hue": `${b.hue}`,
            "--bubble-size": `${bubbleSize(b.text.length)}rem`,
          } as React.CSSProperties}
        >
          <div
            className="bubble-sphere"
            onClick={() => popBubble(b.id)}
            role="button"
            tabIndex={0}
            aria-label={`Pop bubble: ${b.text}`}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') popBubble(b.id); }}
          >
            <div className="bubble-shine" />
            <span className="bubble-text" lang="en">{b.text}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
