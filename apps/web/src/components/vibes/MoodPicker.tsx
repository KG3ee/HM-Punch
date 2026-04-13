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
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={pending}
        aria-label="Set mood"
        title="Click to set your mood"
        style={{
          fontSize: "var(--text-2xl)",
          lineHeight: 1,
          background: "none",
          border: "none",
          cursor: pending ? "wait" : "pointer",
          padding: "var(--space-1)",
          borderRadius: "var(--radius-sm)",
          transition: "transform var(--transition-fast)",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.15)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
      >
        {currentMood ?? "🙂"}
      </button>

      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            style={{ position: "fixed", inset: 0, zIndex: 98 }}
          />
          <div
            className="mood-picker-dropdown"
            style={{ position: "absolute", zIndex: 99, bottom: "2.25rem", left: 0 }}
          >
            {QUICK_MOODS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleSelect(emoji)}
                aria-label={`Set mood to ${emoji}`}
                aria-pressed={currentMood === emoji}
              >
                {emoji}
              </button>
            ))}
            {currentMood && (
              <button
                className="mood-clear"
                onClick={() => handleSelect(null)}
              >
                Clear mood
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
