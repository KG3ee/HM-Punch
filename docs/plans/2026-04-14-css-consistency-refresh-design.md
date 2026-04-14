# CSS Consistency Refresh — Design

**Date:** 2026-04-14
**Status:** Approved

## Goal

Subtle visual consistency pass across all 18 pages. Users should barely notice — it just "feels better." No layout changes, no new features. Pure CSS-first refinement of the shared design system in `globals.css` plus bringing vibes components into the shared class system.

## Approach

CSS-First Token & Component Refresh. Since all pages share a single `globals.css` (3115 lines, 92 tokens, ~40 component classes, zero page-specific CSS), changes cascade to all 18 pages automatically.

## Section 1: Token Consistency

Replace hard-coded values with design token references. No visual change beyond 1-2px shifts.

| Selector | Property | Before | After |
|----------|----------|--------|-------|
| `.button` | border-radius | `--radius-sm` (6px) | `--radius` (8px) |
| `.button` | gap | `0.5rem` | `var(--space-2)` |
| `.button` | padding | `0.5rem 1rem` | `var(--space-2) var(--space-4)` |
| `.input, .select` | border-radius | `--radius-sm` (6px) | `--radius` (8px) |
| `.input, .select` | padding | `0.5rem 0.875rem` | `var(--space-2) var(--space-3)` |
| `.tag` | padding | `0.1875rem 0.625rem` | `var(--space-1) var(--space-2)` |
| `.tag` | gap | `0.25rem` | `var(--space-1)` |
| `th, td` | padding | `0.625rem 0.75rem` | `var(--space-2) var(--space-3)` |
| `.login-wrap` | padding | `1.5rem 1rem` | `var(--space-6) var(--space-4)` |
| `.login-card` | gap | `1.5rem` | `var(--space-6)` |
| `.login-header` | gap | `0.5rem` | `var(--space-2)` |
| `.login-header h1` | font-size | `1.375rem` | `var(--text-3xl)` |
| `.form-grid` | gap | `0.75rem` | `var(--space-3)` |
| `.form-field` | gap | `0.375rem` | `var(--space-1)` |
| `.form-field label` | font-size/weight | `0.8125rem` / `500` | `var(--text-sm)` / `var(--font-medium)` |

## Section 2: Component Class Refinements

### `.card` — Add accent line

Add `::before` pseudo-element with gradient top line (same pattern as `.kpi::before`):
- 2px height, `var(--brand-gradient)`, `opacity: 0`, transitions to `opacity: 1` on hover

### `.button` — Focus-visible ring

Add keyboard accessibility focus ring:
```css
.button:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px var(--brand-dim);
}
```

### Tables — Slightly stronger row hover

`tbody tr:hover` background: `rgba(255,255,255,0.03)` -> `rgba(255,255,255,0.04)`

### Modal — No changes needed

Existing `.modal` + `.modal-overlay` are already well-polished (backdrop blur, spring animation, proper shadow).

### Login — Token consistency only

All hard-coded values replaced with token references (see Section 1 table).

## Section 3: Vibes Component Cleanup

### BubbleButton modal

Replace 30+ lines of inline modal styles with shared `.modal-overlay` + `.modal` classes. Gets backdrop blur, spring animation, and consistent depth for free.

### MoodPicker dropdown

Extract to `.mood-picker-dropdown` CSS class:
```css
.mood-picker-dropdown {
  background: var(--card-elevated);
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  padding: var(--space-2);
}
```
Position/z-index remain inline (layout-specific).

### PaletteSettings

Replace inline style objects with `.button`, `.button-primary`, and token-referenced CSS.

### ReactionFloat / BubbleBanner / Vibes strip

Already fixed — no further changes.

## What Does NOT Change

- Color palette (dark theme stays identical)
- Layout structure (no cards move, no columns rearrange)
- Component hierarchy (no JSX restructuring)
- Functionality (zero logic changes)
- Typography scale (same font sizes, just referenced via tokens)

## Risk

Low. All changes are CSS-only in `globals.css` + 3 vibes component files. Easy to test visually, easy to revert with one `git revert`.
