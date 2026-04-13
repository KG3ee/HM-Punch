"use client";

import { useState } from "react";

interface BubbleButtonProps {
  isPunchedIn: boolean;
  onSend: (text: string) => Promise<void>;
}

export function BubbleButton({ isPunchedIn, onSend }: BubbleButtonProps) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isPunchedIn) return null;

  async function handleSend() {
    const trimmed = text.trim();
    if (!trimmed) return;
    setSending(true);
    setError(null);
    try {
      await onSend(trimmed);
      setText("");
      setOpen(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to send");
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Send anonymous message to team"
        title="Send anonymous bubble"
        style={{
          background: 'none',
          border: 'none',
          fontSize: '1.5rem',
          cursor: 'pointer',
          padding: '0.25rem',
          borderRadius: '50%',
          lineHeight: 1,
        }}
      >
        📢
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => { setOpen(false); setText(""); }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 99,
              background: 'rgba(0, 0, 0, 0.5)',
            }}
          />
          {/* Modal */}
          <div
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 100,
              background: 'var(--card-elevated)',
              border: '1px solid var(--line)',
              borderRadius: '0.75rem',
              padding: '1.5rem',
              width: '90%',
              maxWidth: '24rem',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
            }}
          >
            <h3 style={{ fontWeight: 700, fontSize: '1.125rem', marginBottom: '0.5rem' }}>
              Anonymous Bubble
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '0.75rem' }}>
              Your message appears on the live board for 60 seconds. No name attached.
            </p>
            <textarea
              className="input"
              maxLength={80}
              rows={3}
              placeholder="What's on your mind? (max 80 chars)"
              value={text}
              onChange={(e) => setText(e.target.value)}
              style={{
                width: '100%',
                resize: 'none',
                fontFamily: 'inherit',
                minHeight: '4.5rem',
              }}
            />
            <div style={{ fontSize: '0.75rem', textAlign: 'right', color: 'var(--muted)', marginTop: '0.25rem' }}>
              {text.length}/80
            </div>
            {error && <p style={{ color: 'var(--danger)', fontSize: '0.85rem', marginTop: '0.25rem' }}>{error}</p>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
              <button
                className="button"
                onClick={() => { setOpen(false); setText(""); }}
              >
                Cancel
              </button>
              <button
                className="button button-primary"
                disabled={!text.trim() || sending}
                onClick={handleSend}
              >
                {sending ? "Sending…" : "Send"}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
