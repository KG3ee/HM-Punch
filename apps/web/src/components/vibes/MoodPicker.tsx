"use client";

import { useState } from "react";

const QUICK_MOODS = ["😊", "🔥", "😴", "💪", "🤔", "😎", "🙏", "🎯"];

interface MoodPickerProps {
  currentMood: string | null | undefined;
  onSelect: (mood: string | null) => void | Promise<void>;
}

export function MoodPicker({ currentMood, onSelect }: MoodPickerProps) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleSelect(mood: string | null) {
    setPending(true);
    try {
      await onSelect(mood);
    } finally {
      setPending(false);
      setOpen(false);
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={pending}
        className="text-lg leading-none hover:scale-110 transition-transform"
        aria-label="Set mood"
        title="Click to set your mood"
      >
        {currentMood ?? "🙂"}
      </button>

      {open && (
        <div
          className="absolute z-50 bottom-8 left-0 p-2 flex flex-wrap gap-1 w-44 shadow-lg"
          style={{
            background: "var(--card-elevated)",
            border: "1px solid var(--line)",
            borderRadius: "var(--radius-md, 8px)",
          }}
        >
          {QUICK_MOODS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleSelect(emoji)}
              className="text-xl hover:scale-125 transition-transform p-1"
              aria-label={`Set mood to ${emoji}`}
            >
              {emoji}
            </button>
          ))}
          <button
            onClick={() => handleSelect(null)}
            className="text-xs w-full text-center mt-1"
            style={{ color: "var(--muted)" }}
          >
            Clear mood
          </button>
        </div>
      )}
    </div>
  );
}
