# KPI Card Cleanup — Remove Redundant, Make Clickable

**Date:** 2026-04-14

## Problem

18 KPI cards across 3 dashboards. Most are static dead-end numbers. Several duplicate info shown in tables below them. Only 2 out of 18 are clickable.

## Design

All remaining KPIs become clickable navigation shortcuts to detail pages. Use `router.push()` on click with `cursor: pointer` and hover feedback.

### Employee Dashboard (MEMBER/ADMIN)

**Remove:**
- ~~Break~~ — redundant with break card + controls below
- ~~Sessions~~ — just a count; Current Session table has full detail

**Keep (5 cards), all clickable:**
| KPI | Links to |
|-----|----------|
| Month Hours | `/admin/history` (admin) or `/employee/requests` (member) |
| Month Late | Same |
| Overtime | Same |
| Duty | Scroll to Current Session on same page |
| Late | `/employee/requests` |

### Admin Live Dashboard

**Remove:**
- ~~Date~~ — obvious, visual noise
- ~~Total Today~~ — weak; Active Now is what matters live, total is in History

**Keep (4 cards), all clickable:**
| KPI | Links to |
|-----|----------|
| Active Now | `/admin/history` |
| Late | `/admin/deductions` |
| Requests | `/admin/requests` (already clickable) |
| Signups | `/admin/users?section=registrations` (already clickable) |

### Leader Dashboard

**Remove:**
- ~~Active~~ — duplicates Who's On Duty table
- ~~Total~~ — duplicates same table

**Keep (6 cards), all clickable:**
| KPI | Links to |
|-----|----------|
| Late | `/employee/requests` |
| Requests | `/employee/requests` |
| Violations | `/employee/requests` |
| Month Hours | `/employee/requests` |
| Month Late | `/employee/requests` |
| Overtime | `/employee/requests` |

## CSS Changes

- `.kpi` gets `cursor: pointer` and enhanced hover state
- Add subtle arrow/chevron indicator on clickable KPIs
- Existing `.kpi:hover` already has accent line; ensure it signals "clickable"

## Files to Change

- `apps/web/src/app/employee/dashboard/page.tsx` — remove Break + Sessions KPIs, wrap remaining in links
- `apps/web/src/app/admin/live/page.tsx` — remove Date + Total Today KPIs, make Active Now + Late clickable
- `apps/web/src/components/leader-dashboard.tsx` — remove Active + Total KPIs, make rest clickable
- `apps/web/src/app/globals.css` — clickable KPI hover styles
