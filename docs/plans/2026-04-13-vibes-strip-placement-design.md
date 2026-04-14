# Vibes Strip Placement Design

**Date:** 2026-04-13
**Status:** Approved

## Problem

The Team Vibes card (mood picker + bubble button) is buried at the bottom of the left column in the employee dashboard. Since users do quick-glance visits (<10 seconds), anything below the fold is invisible.

## Decision

Move vibes into a **dedicated full-width strip** between the KPI row and the two-column split layout, visible only when the user has an active session.

## Layout

```
[ Sessions │ Duty │ Break │ Late ]       ← existing KPI row
┌───────────────────────────────────────┐
│  😊 😎 🔥 (mood)   │  💬 Send to team │ ← vibes strip (NEW)
└───────────────────────────────────────┘
LEFT COLUMN             RIGHT COLUMN     ← existing split
```

## Behaviour

- Only rendered when `activeSession` is truthy (punched in)
- Entrance animation via existing `card-animate` class
- Two zones: left = MoodPicker, right = BubbleButton
- Responsive: on mobile (<=640px), zones stack vertically

## Styling

- New CSS class `.vibes-strip` — flexbox row, gap, card-elevated background
- Uses existing CSS variables: `--card-elevated`, `--line`, `--muted`, `--primary`
- Compact height (~48px desktop)
- Mobile breakpoint: flex-direction column

## Changes Required

1. **Remove** the `<article className="card card-animate">` Team Vibes block from the bottom of the left `SplitColumnStack` (dashboard page ~lines 1745-1766)
2. **Add** a new `{activeSession && <section className="vibes-strip card-animate">}` block between the KPI `</section>` (line 1545) and `<section className="split">` (line 1548)
3. **Add** `.vibes-strip` CSS rules to `globals.css` (flexbox row, responsive stack)

## Alternatives Considered

- **Inline in punch card** — contextually perfect but makes the punch card busier
- **Top of right column** — above fold on desktop, but falls below fold on mobile single-column layout
