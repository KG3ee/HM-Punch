"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/** Matches most emoji (including multi-codepoint sequences like flags, skin tones, ZWJ combos). */
const EMOJI_REGEX =
  /[\p{Emoji_Presentation}\p{Extended_Pictographic}](\u200D[\p{Emoji_Presentation}\p{Extended_Pictographic}]|\uFE0F)*/u;

function extractEmoji(value: string): string | null {
  const match = value.match(EMOJI_REGEX);
  return match ? match[0] : null;
}

interface MoodPickerProps {
  currentMood: string | null | undefined;
  onSelect: (mood: string | null) => void | Promise<void>;
}

export function MoodPicker({ currentMood, onSelect }: MoodPickerProps) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Position the popover above the trigger button and auto-focus input
  useEffect(() => {
    if (!open || !btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    setPopoverPos({
      top: rect.top - 8, // 8px gap above the button
      left: rect.right,  // right-align with button
    });
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  async function handleSelect(mood: string | null) {
    setPending(true);
    try {
      await onSelect(mood);
    } finally {
      setPending(false);
      setOpen(false);
    }
  }

  function handleInput(e: React.FormEvent<HTMLInputElement>) {
    const raw = e.currentTarget.value;
    const emoji = extractEmoji(raw);
    if (emoji) {
      void handleSelect(emoji);
    } else {
      // Strip non-emoji characters
      e.currentTarget.value = "";
    }
  }

  return (
    <>
      <button
        ref={btnRef}
        onClick={() => setOpen((v) => !v)}
        disabled={pending}
        className="nav-vibes-mood-btn"
        aria-label="Set mood"
        title="Click to set your mood"
      >
        {currentMood ?? "🙂"}
      </button>

      {open && createPortal(
        <>
          <div
            onClick={() => setOpen(false)}
            style={{ position: "fixed", inset: 0, zIndex: 998 }}
          />
          <div
            className="mood-picker-popover"
            style={{
              position: "fixed",
              zIndex: 999,
              top: popoverPos ? popoverPos.top : 0,
              left: popoverPos ? popoverPos.left : 0,
              transform: "translate(-100%, -100%)",
            }}
          >
            <input
              ref={inputRef}
              className="mood-picker-input"
              type="text"
              placeholder="Pick an emoji..."
              maxLength={8}
              onInput={handleInput}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setOpen(false);
                }
              }}
              autoComplete="off"
              spellCheck={false}
            />
            {currentMood && (
              <button
                className="mood-clear-btn"
                onClick={() => handleSelect(null)}
              >
                ✕ Clear mood
              </button>
            )}
          </div>
        </>,
        document.body,
      )}
    </>
  );
}
