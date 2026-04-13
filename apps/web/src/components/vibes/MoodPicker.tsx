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
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={pending}
        aria-label="Set mood"
        title="Click to set your mood"
        style={{
          fontSize: '1.25rem',
          lineHeight: 1,
          background: 'none',
          border: 'none',
          cursor: pending ? 'wait' : 'pointer',
          padding: '0.25rem',
          borderRadius: '0.375rem',
          transition: 'transform 0.15s ease',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.15)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
      >
        {currentMood ?? "🙂"}
      </button>

      {open && (
        <>
          {/* Invisible backdrop to close picker */}
          <div
            onClick={() => setOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 98 }}
          />
          {/* Emoji picker dropdown */}
          <div
            style={{
              position: 'absolute',
              zIndex: 99,
              bottom: '2.25rem',
              left: 0,
              padding: '0.5rem',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.25rem',
              width: '11rem',
              background: 'var(--card-elevated)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius-lg, 12px)',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
            }}
          >
            {QUICK_MOODS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleSelect(emoji)}
                aria-label={`Set mood to ${emoji}`}
                style={{
                  fontSize: '1.25rem',
                  padding: '0.375rem',
                  background: currentMood === emoji ? 'var(--primary-muted, rgba(99,102,241,0.15))' : 'none',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  transition: 'transform 0.1s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.25)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
              >
                {emoji}
              </button>
            ))}
            {currentMood && (
              <button
                onClick={() => handleSelect(null)}
                style={{
                  fontSize: '0.75rem',
                  width: '100%',
                  textAlign: 'center',
                  marginTop: '0.25rem',
                  color: 'var(--muted)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0.25rem',
                }}
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
