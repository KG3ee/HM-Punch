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
        className="btn btn-circle btn-ghost text-2xl"
        aria-label="Send anonymous message to team"
        title="Send anonymous bubble"
      >
        📢
      </button>

      {open && (
        <dialog open className="modal modal-bottom sm:modal-middle">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-2">Anonymous Bubble</h3>
            <p className="text-sm text-base-content/60 mb-3">
              Your message appears on the live board for 60 seconds. No name attached.
            </p>
            <textarea
              className="textarea textarea-bordered w-full"
              maxLength={80}
              rows={3}
              placeholder="What&apos;s on your mind? (max 80 chars)"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <div className="text-xs text-right text-base-content/40 mt-1">
              {text.length}/80
            </div>
            {error && <p className="text-error text-sm mt-1">{error}</p>}
            <div className="modal-action">
              <button className="btn" onClick={() => { setOpen(false); setText(""); }}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                disabled={!text.trim() || sending}
                onClick={handleSend}
              >
                {sending ? "Sending…" : "Send"}
              </button>
            </div>
          </div>
          <form
            method="dialog"
            className="modal-backdrop"
            onSubmit={() => { setOpen(false); setText(""); }}
          />
        </dialog>
      )}
    </>
  );
}
