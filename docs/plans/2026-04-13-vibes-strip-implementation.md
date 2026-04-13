# Vibes Strip Placement Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Move the Team Vibes UI from the bottom of the left column to a prominent full-width strip between the KPI row and the split layout.

**Architecture:** Remove the existing `<article>` block from the left `SplitColumnStack`, add a new `<section className="vibes-strip">` between the KPI `</section>` and `<section className="split">`, and add CSS for the strip layout with responsive stacking.

**Tech Stack:** Next.js (React), CSS (globals.css), existing MoodPicker + BubbleButton components

---

### Task 1: Add `.vibes-strip` CSS

**Files:**
- Modify: `apps/web/src/app/globals.css` (insert after the `.kpi-grid` block, around line 988)

**Step 1: Add the CSS rules**

Insert the following CSS immediately after the `.kpi-grid { ... }` block (after line 987):

```css
/* ── Vibes Strip (mood + bubble, between KPI row and split) ── */
.vibes-strip {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 0.625rem 1rem;
  background: var(--card-elevated);
  border-radius: 0.75rem;
  border: 1px solid var(--line);
}

.vibes-strip .vibes-zone {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.vibes-strip .vibes-zone-label {
  font-size: 0.75rem;
  color: var(--muted);
  font-weight: 500;
}

@media (max-width: 640px) {
  .vibes-strip {
    flex-direction: column;
    align-items: stretch;
    gap: 0.75rem;
  }
}
```

**Step 2: Verify no CSS conflicts**

Run: `grep -n "vibes-strip" apps/web/src/app/globals.css`
Expected: Only the lines you just added

**Step 3: Commit**

```bash
git add apps/web/src/app/globals.css
git commit -m "style: add .vibes-strip CSS for full-width vibes bar"
```

---

### Task 2: Move vibes from left column to strip position

**Files:**
- Modify: `apps/web/src/app/employee/dashboard/page.tsx`

**Step 1: Remove the old Team Vibes block**

Delete the entire block from inside the left `SplitColumnStack` (lines 1745-1766):

```tsx
              {/* ── Team Vibes (visible when punched in) ── */}
              {activeSession ? (
                <article className="card card-animate">
                  <h3>✨ Team Vibes</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Your mood</span>
                      <MoodPicker
                        currentMood={null}
                        onSelect={async (mood) => { await setMood(mood); }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Team broadcast</span>
                      <BubbleButton
                        isPunchedIn={!!activeSession}
                        onSend={sendBubble}
                      />
                    </div>
                  </div>
                </article>
              ) : null}
```

**Step 2: Add the vibes strip between KPI row and split layout**

Find the gap between `</section>` (end of KPI grid, line 1545) and `{/* ── Main Layout (non-Leader) ── */}` (line 1547). Insert:

```tsx
          {/* ── Vibes Strip (visible when punched in) ── */}
          {activeSession ? (
            <section className="vibes-strip card-animate">
              <div className="vibes-zone">
                <span className="vibes-zone-label">Your mood</span>
                <MoodPicker
                  currentMood={null}
                  onSelect={async (mood) => { await setMood(mood); }}
                />
              </div>
              <div className="vibes-zone">
                <span className="vibes-zone-label">Team broadcast</span>
                <BubbleButton
                  isPunchedIn={!!activeSession}
                  onSend={sendBubble}
                />
              </div>
            </section>
          ) : null}
```

**Step 3: Commit**

```bash
git add apps/web/src/app/employee/dashboard/page.tsx
git commit -m "feat: move vibes to full-width strip above split layout"
```

---

### Task 3: TypeScript check + push to staging

**Files:** None (verification only)

**Step 1: Run TypeScript check**

Run: `./node_modules/.bin/tsc --project apps/web/tsconfig.json --noEmit`
Expected: Clean exit, no errors

**Step 2: Push to staging**

Run: `git push origin codex/staging`
Expected: Push succeeds, Dokploy auto-deploys

---
