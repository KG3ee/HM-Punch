"use client";

import { useEffect, useRef, useState } from "react";

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
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input when popover opens
  useEffect(() => {
    if (open && inputRef.current) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
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
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={pending}
        className="nav-vibes-mood-btn"
        aria-label="Set mood"
        title="Click to set your mood"
      >
        {currentMood ?? "🙂"}
      </button>

      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            style={{ position: "fixed", inset: 0, zIndex: 98 }}
          />
          <div className="mood-picker-popover" style={{ zIndex: 99 }}>
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
        </>
      )}
    </div>
  );
}
