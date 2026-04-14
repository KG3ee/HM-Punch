"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const DEFAULT_PALETTE = ["🎉", "👍", "🔥", "💪", "😎", "🚀"];

interface ReactionButtonProps {
  palette?: string[];
  onSend: (emoji: string) => Promise<void>;
}

export function ReactionButton({ palette, onSend }: ReactionButtonProps) {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const emojis = palette && palette.length > 0 ? palette : DEFAULT_PALETTE;

  useEffect(() => {
    if (!open || !btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    setPopoverPos({
      top: rect.bottom + 8,
      left: rect.right,
    });
  }, [open]);

  async function handleSend(emoji: string) {
    setSending(true);
    try {
      await onSend(emoji);
    } finally {
      setSending(false);
      setOpen(false);
    }
  }

  return (
    <>
      <button
        ref={btnRef}
        onClick={() => setOpen((v) => !v)}
        disabled={sending}
        className="nav-vibes-reaction-btn"
        aria-label="Send reaction"
        title="Send a reaction emoji"
      >
        🎉
      </button>

      {open && createPortal(
        <>
          <div
            onClick={() => setOpen(false)}
            style={{ position: "fixed", inset: 0, zIndex: 998 }}
          />
          <div
            className="reaction-picker-popover"
            style={{
              position: "fixed",
              zIndex: 999,
              top: popoverPos ? popoverPos.top : 0,
              left: popoverPos ? popoverPos.left : 0,
              transform: "translateX(-100%)",
            }}
          >
            {emojis.map((emoji) => (
              <button
                key={emoji}
                className="reaction-picker-emoji"
                onClick={() => handleSend(emoji)}
                disabled={sending}
                aria-label={`React with ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </>,
        document.body,
      )}
    </>
  );
}
