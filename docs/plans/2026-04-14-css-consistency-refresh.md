# CSS Consistency Refresh Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Subtle visual consistency pass across all 18 pages by refining shared CSS tokens and component classes in globals.css, plus bringing vibes components into the shared class system.

**Architecture:** CSS-first approach — all 18 pages share a single `globals.css` with 92 design tokens and ~40 component classes. Editing these shared rules cascades to every page automatically. Three vibes components get their inline styles replaced with shared classes.

**Tech Stack:** Vanilla CSS (globals.css), React components (Next.js)

---

### Task 1: Token consistency — `.button`

**Files:**
- Modify: `apps/web/src/app/globals.css` (lines 196-215)

**Step 1: Update `.button` base class**

Find:
```css
.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  font-size: var(--text-base);
  font-weight: var(--font-medium);
  font-family: inherit;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
```

Replace with:
```css
.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  font-size: var(--text-base);
  font-weight: var(--font-medium);
  font-family: inherit;
  border: 1px solid transparent;
  border-radius: var(--radius);
```

**Step 2: Add focus-visible ring**

Find the `.button:disabled` block (around line 236) and insert BEFORE it:

```css
.button:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px var(--brand-dim);
}
```

**Step 3: Commit**

```bash
git add apps/web/src/app/globals.css
git commit -m "style: tokenize .button padding/gap/radius + add focus-visible ring"
```

---

### Task 2: Token consistency — `.input`, `.select`

**Files:**
- Modify: `apps/web/src/app/globals.css` (lines 451-467)

**Step 1: Update `.input, .select` base**

Find:
```css
.input,
.select {
  width: 100%;
  height: 2.5rem;
  border: 1px solid var(--line-hover);
  border-radius: var(--radius-sm);
  padding: 0.5rem 0.875rem;
```

Replace with:
```css
.input,
.select {
  width: 100%;
  height: 2.5rem;
  border: 1px solid var(--line-hover);
  border-radius: var(--radius);
  padding: var(--space-2) var(--space-3);
```

**Step 2: Commit**

```bash
git add apps/web/src/app/globals.css
git commit -m "style: tokenize .input/.select padding and radius"
```

---

### Task 3: Token consistency — `.tag`

**Files:**
- Modify: `apps/web/src/app/globals.css` (lines 525-540)

**Step 1: Update `.tag` base**

Find:
```css
.tag {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.1875rem 0.625rem;
```

Replace with:
```css
.tag {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-2);
```

**Step 2: Commit**

```bash
git add apps/web/src/app/globals.css
git commit -m "style: tokenize .tag padding and gap"
```

---

### Task 4: Token consistency — tables

**Files:**
- Modify: `apps/web/src/app/globals.css` (lines 628-660)

**Step 1: Update table cell padding**

Find:
```css
th, td {
  border-bottom: 1px solid var(--line);
  text-align: left;
  padding: 0.625rem 0.75rem;
```

Replace with:
```css
th, td {
  border-bottom: 1px solid var(--line);
  text-align: left;
  padding: var(--space-2) var(--space-3);
```

**Step 2: Bump row hover visibility**

Find:
```css
tbody tr:hover {
  background: rgba(255, 255, 255, 0.03);
}
```

Replace with:
```css
tbody tr:hover {
  background: rgba(255, 255, 255, 0.04);
}
```

**Step 3: Commit**

```bash
git add apps/web/src/app/globals.css
git commit -m "style: tokenize table padding + slightly stronger row hover"
```

---

### Task 5: Token consistency — login page

**Files:**
- Modify: `apps/web/src/app/globals.css` (lines 1449-1500)

**Step 1: Update login classes**

Find:
```css
.login-wrap {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 1.5rem 1rem;
}

.login-card {
  width: min(400px, 94vw);
  display: grid;
  gap: 1.5rem;
}

.login-header {
  display: grid;
  gap: 0.5rem;
}

.login-header h1 {
  font-size: 1.375rem;
  font-weight: 700;
  letter-spacing: -0.03em;
  color: var(--ink);
}

.login-header p {
  font-size: 0.875rem;
  color: var(--muted);
}
```

Replace with:
```css
.login-wrap {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: var(--space-6) var(--space-4);
}

.login-card {
  width: min(400px, 94vw);
  display: grid;
  gap: var(--space-6);
}

.login-header {
  display: grid;
  gap: var(--space-2);
}

.login-header h1 {
  font-size: var(--text-3xl);
  font-weight: var(--font-bold);
  letter-spacing: -0.03em;
  color: var(--ink);
}

.login-header p {
  font-size: var(--text-base);
  color: var(--muted);
}
```

**Step 2: Update form classes**

Find:
```css
.form-grid {
  display: grid;
  gap: 0.75rem;
}

.form-field {
  display: grid;
  gap: 0.375rem;
}

.form-field label {
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--ink-2);
}
```

Replace with:
```css
.form-grid {
  display: grid;
  gap: var(--space-3);
}

.form-field {
  display: grid;
  gap: var(--space-1);
}

.form-field label {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--ink-2);
}
```

**Step 3: Commit**

```bash
git add apps/web/src/app/globals.css
git commit -m "style: tokenize login page and form layout values"
```

---

### Task 6: `.card` accent line

**Files:**
- Modify: `apps/web/src/app/globals.css` (after `.card` block, around line 507)

**Step 1: Add position relative to `.card`**

Find:
```css
.card {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  transition: all var(--transition);
  min-width: 0;
  overflow: hidden;
  box-shadow: var(--shadow-sm);
}
```

Replace with:
```css
.card {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  transition: all var(--transition);
  min-width: 0;
  overflow: hidden;
  box-shadow: var(--shadow-sm);
  position: relative;
}
```

**Step 2: Add accent line pseudo-element**

Insert immediately after the `.card:hover` block (after line ~513):

```css
.card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--brand-gradient);
  opacity: 0;
  transition: opacity var(--transition);
}

.card:hover::before {
  opacity: 1;
}
```

**Step 3: Commit**

```bash
git add apps/web/src/app/globals.css
git commit -m "style: add gradient accent line on .card hover (matches .kpi pattern)"
```

---

### Task 7: BubbleButton — use shared modal classes

**Files:**
- Modify: `apps/web/src/components/vibes/BubbleButton.tsx`

**Step 1: Replace inline-style modal with shared classes**

Replace the entire `{open && (` block (everything between `{open && (` and matching `)}`) with:

```tsx
      {open && (
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
                {sending ? "Sending\u2026" : "Send"}
              </button>
            </div>
          </div>
        </div>
      )}
```

**Step 2: Commit**

```bash
git add apps/web/src/components/vibes/BubbleButton.tsx
git commit -m "refactor: BubbleButton modal uses shared .modal-overlay + .modal classes"
```

---

### Task 8: MoodPicker — extract dropdown class

**Files:**
- Modify: `apps/web/src/app/globals.css` (insert after `.vibes-strip` block)
- Modify: `apps/web/src/components/vibes/MoodPicker.tsx`

**Step 1: Add CSS class**

Insert after the `.vibes-strip` responsive media query block in globals.css:

```css
/* ── Mood Picker Dropdown ── */
.mood-picker-dropdown {
  background: var(--card-elevated);
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  padding: var(--space-2);
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
  width: 11rem;
}

.mood-picker-dropdown button {
  font-size: var(--text-2xl);
  padding: var(--space-1);
  background: none;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: transform var(--transition-fast);
  line-height: 1;
}

.mood-picker-dropdown button:hover {
  transform: scale(1.25);
}

.mood-picker-dropdown button[aria-pressed="true"] {
  background: var(--brand-dim);
}

.mood-picker-dropdown .mood-clear {
  font-size: var(--text-xs);
  width: 100%;
  text-align: center;
  margin-top: var(--space-1);
  color: var(--muted);
  padding: var(--space-1);
}

.mood-picker-dropdown .mood-clear:hover {
  transform: none;
  color: var(--ink-2);
}
```

**Step 2: Update MoodPicker component**

Replace the entire file `apps/web/src/components/vibes/MoodPicker.tsx` with:

```tsx
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
```

**Step 3: Commit**

```bash
git add apps/web/src/app/globals.css apps/web/src/components/vibes/MoodPicker.tsx
git commit -m "refactor: extract MoodPicker dropdown to CSS class with design tokens"
```

---

### Task 9: PaletteSettings — use shared classes and tokens

**Files:**
- Modify: `apps/web/src/components/vibes/PaletteSettings.tsx`

**Step 1: Replace inline styles with shared classes and token references**

Replace the entire file with:

```tsx
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
```

**Step 2: Commit**

```bash
git add apps/web/src/components/vibes/PaletteSettings.tsx
git commit -m "refactor: PaletteSettings uses shared .button classes and design tokens"
```

---

### Task 10: TypeScript check + push to staging

**Files:** None (verification only)

**Step 1: Run TypeScript check**

Run: `./node_modules/.bin/tsc --project apps/web/tsconfig.json --noEmit`
Expected: Clean exit, no errors

**Step 2: Push to staging**

Run: `git push origin codex/staging`
Expected: Push succeeds, Dokploy auto-deploys

---
