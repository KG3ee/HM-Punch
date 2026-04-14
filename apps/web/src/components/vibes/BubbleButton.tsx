"use client";

import { useState } from "react";
import { createPortal } from "react-dom";

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
        className="nav-vibes-shout-btn"
        aria-label="Send anonymous message to team"
        title="Send anonymous bubble"
      >
        💬
      </button>

      {open && createPortal(
        <div className="modal-overlay" onClick={() => { setOpen(false); setText(""); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: 'min(400px, 94vw)' }}>
            <h3>Anonymous Bubble</h3>
            <p style={{ fontSize: 'var(--text-base)', color: 'var(--muted)', marginBottom: 'var(--space-3)' }}>
              Your message appears on the live board for 60 seconds. No name attached.
            </p>
            <textarea
              className="input"
              maxLength={80}
              rows={3}
              placeholder="What's on your mind? (max 80 chars)"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
                if (e.key === 'Escape') {
                  setOpen(false);
                  setText("");
                }
              }}
              style={{ width: '100%', resize: 'none', fontFamily: 'inherit', minHeight: '4.5rem' }}
            />
            <div style={{ fontSize: 'var(--text-xs)', textAlign: 'right', color: 'var(--muted)', marginTop: 'var(--space-1)' }}>
              {text.length}/80
            </div>
            {error && <p style={{ color: 'var(--danger)', fontSize: 'var(--text-base)', marginTop: 'var(--space-1)' }}>{error}</p>}
            <div className="modal-footer">
              <button className="button" onClick={() => { setOpen(false); setText(""); }}>
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
        </div>,
        document.body,
      )}
    </>
  );
}
