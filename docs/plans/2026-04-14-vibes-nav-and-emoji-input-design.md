# Vibes Nav Placement + Emoji Keyboard Input

**Date:** 2026-04-14

## Problem

1. Vibes strip takes a full row of vertical space on dashboards
2. Mood picker only offers 8 preset emojis — no custom input

## Design

### 1. Move Vibes to Nav Bar

Move mood + bubble controls from dedicated `vibes-strip` sections into the `AppShell` nav bar, right-aligned opposite the nav tabs.

```
[ Dashboard | History | Requests ]          [ 😊 ] [ 💬 Bubble ]
  ← tabs left                                    vibes right →
```

- Remove `<section className="vibes-strip">` from employee dashboard and admin live page
- Add vibes controls to `.shell-nav` in `app-shell.tsx`
- Only visible when user has an active punch session
- `.shell-nav` uses `justify-content: space-between`
- Mobile: vibes controls at right end of nav row

### 2. Emoji Keyboard Input

Replace the 8-emoji grid with a single text input that accepts only emoji.

**Flow:** Click mood → popover with auto-focused input → user opens OS emoji picker → valid emoji auto-submits → popover closes.

**Validation:** Regex filter on Unicode emoji ranges. Non-emoji chars silently stripped. `maxLength=2`.

**Controls:** Escape to close. "Clear" link to reset mood. No submit button — auto-sends on valid emoji input.

## Files to Change

- `apps/web/src/components/app-shell.tsx` — add vibes controls to nav bar
- `apps/web/src/components/vibes/MoodPicker.tsx` — replace grid with emoji input
- `apps/web/src/app/globals.css` — nav vibes styles, remove vibes-strip usage
- `apps/web/src/app/employee/dashboard/page.tsx` — remove vibes-strip section
- `apps/web/src/app/admin/live/page.tsx` — remove vibes-strip section
