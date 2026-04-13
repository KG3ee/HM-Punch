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
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      <p style={{ fontSize: "var(--text-base)", color: "var(--muted)" }}>
        Pick up to 6 emojis for your reaction palette. These appear when teammates hover your
        avatar on the live board.
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}>
        {EMOJI_SUGGESTIONS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => toggle(emoji)}
            aria-label={`${palette.includes(emoji) ? "Remove" : "Add"} ${emoji} from palette`}
            aria-pressed={palette.includes(emoji)}
            style={{
              fontSize: "var(--text-3xl)",
              padding: "var(--space-1) var(--space-2)",
              borderRadius: "var(--radius)",
              border: "2px solid",
              borderColor: palette.includes(emoji) ? "var(--brand)" : "transparent",
              background: palette.includes(emoji) ? "var(--brand-dim)" : "transparent",
              opacity: !palette.includes(emoji) && palette.length >= 6 ? 0.4 : 1,
              cursor: !palette.includes(emoji) && palette.length >= 6 ? "not-allowed" : "pointer",
              transform: palette.includes(emoji) ? "scale(1.1)" : "scale(1)",
              transition: "all var(--transition)",
            }}
          >
            {emoji}
          </button>
        ))}
      </div>
      <p style={{ fontSize: "var(--text-xs)", color: "var(--muted)" }}>
        Selected: {palette.length === 0 ? "none" : palette.join(" ")} ({palette.length}/6)
      </p>
      <button
        className={saved ? "button button-ok" : "button button-primary"}
        onClick={handleSave}
        disabled={saving}
        style={{ alignSelf: "flex-start" }}
      >
        {saving ? "Saving\u2026" : saved ? "Saved \u2713" : "Save palette"}
      </button>
    </div>
  );
}
