"use client";

import { useState } from "react";

const EMOJI_SUGGESTIONS = ["🎉", "👍", "🔥", "💪", "😎", "🚀", "❤️", "🤝", "✨", "🏆"];

interface PaletteSettingsProps {
  initial: string[];
  onSave: (palette: string[]) => Promise<void>;
}

export function PaletteSettings({ initial, onSave }: PaletteSettingsProps) {
  const [palette, setPalette] = useState<string[]>(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function toggle(emoji: string) {
    setPalette((prev) =>
      prev.includes(emoji)
        ? prev.filter((e) => e !== emoji)
        : prev.length < 6
        ? [...prev, emoji]
        : prev,
    );
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(palette);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <p style={{ fontSize: "0.875rem", color: "var(--muted)" }}>
        Pick up to 6 emojis for your reaction palette. These appear when teammates hover your
        avatar on the live board.
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
        {EMOJI_SUGGESTIONS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => toggle(emoji)}
            aria-label={`${palette.includes(emoji) ? "Remove" : "Add"} ${emoji} from palette`}
            aria-pressed={palette.includes(emoji)}
            style={{
              fontSize: "1.5rem",
              padding: "4px 8px",
              borderRadius: "6px",
              border: "2px solid",
              borderColor: palette.includes(emoji) ? "var(--primary, #6366f1)" : "transparent",
              background: palette.includes(emoji) ? "var(--primary-muted, #e0e7ff)" : "transparent",
              opacity: !palette.includes(emoji) && palette.length >= 6 ? 0.4 : 1,
              cursor: !palette.includes(emoji) && palette.length >= 6 ? "not-allowed" : "pointer",
              transform: palette.includes(emoji) ? "scale(1.1)" : "scale(1)",
              transition: "all 0.15s ease",
            }}
          >
            {emoji}
          </button>
        ))}
      </div>
      <p style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
        Selected: {palette.length === 0 ? "none" : palette.join(" ")} ({palette.length}/6)
      </p>
      <button
        onClick={handleSave}
        disabled={saving}
        style={{
          alignSelf: "flex-start",
          padding: "6px 16px",
          borderRadius: "6px",
          background: saved ? "var(--success-muted, #d1fae5)" : "var(--primary, #6366f1)",
          color: saved ? "var(--success, #059669)" : "white",
          border: "none",
          cursor: saving ? "not-allowed" : "pointer",
          fontSize: "0.875rem",
          fontWeight: 500,
        }}
      >
        {saving ? "Saving…" : saved ? "Saved ✓" : "Save palette"}
      </button>
    </div>
  );
}
