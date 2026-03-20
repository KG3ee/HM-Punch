# Notification Read Race Fix — Design

**Date:** 2026-03-20
**Status:** Approved

## Problem

Opening the notification bell exhibits two symptoms:

- **B (bold items):** Notifications appear bold/unread inside the dropdown even after opening it
- **A (badge reappears):** The unread badge comes back after navigating to another page

Both share the same root cause: a race condition in `openBell()` inside `notification-bell.tsx`.

`Promise.all([refreshList(), markAllNotificationsRead()])` fires both operations simultaneously. `refreshList()` often wins the race and fetches from the DB *before* `markAllNotificationsRead()` has finished writing — returning rows with `isRead: false`. The `.map()` patch on line 90 tries to paper over this in local state, but on the next page load the component remounts and `refreshUnread()` fetches the real DB count, revealing the badge again.

## Fix

Run the two operations sequentially instead of in parallel:

1. `markAllNotificationsRead()` — write to DB first
2. `refreshList()` — fetch list after DB is updated (rows now come back `isRead: true`)
3. Remove the `.map()` patch on line 90 — no longer needed

`setUnreadCount(0)` stays in place to clear the badge immediately without waiting for the fetch.

If `markAllNotificationsRead()` fails, the error is caught and `refreshList()` still runs — the list will reflect the true DB state and the badge will accurately show whatever remains unread.

## Scope

**One file changed:** `apps/web/src/components/notification-bell.tsx`

**No changes to:**
- API endpoints or service
- Database schema
- Push notification logic
- Polling interval
- Any other component

## Success Criteria

- Opening the bell shows all notifications as dimmed/normal weight immediately
- Badge goes to 0 and stays 0 after closing and navigating
- If the API call fails, badge accurately reflects real unread count (no false 0)
