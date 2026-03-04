# User Manual: Modern Punch

This guide is split into Employee and Admin sections and matches the current app workflow.

## Access
- Open the web URL on desktop browser.
- Sign in with username and password.
- New users can submit account request from `/register`.

Note:
- Member login/register screens are blocked on mobile with an office-desktop warning.

## Employee Guide

### 1) Register account request (if you do not have account)
1. Open `/register`.
2. Fill in first name, last name (optional), display name, username, password, and staff code.
3. Submit request.
4. Wait for admin approval.

### 2) Punch ON / OFF
1. Click `Punch ON` to start duty.
2. A confirmation modal appears:
   - shows actual recorded time
   - `Enter` confirms
   - `Esc` cancels
3. Click `Punch OFF` at end of shift (same confirmation behavior).

### 3) Breaks
1. Break buttons are enabled only when:
   - you are on active duty
   - no other break is active
2. Break shortcuts:
   - `B` = `BWC`
   - `W` = `WC`
   - `C` = `CY`
   - `1` = `CF+1`
   - `2` = `CF+2`
   - `3` = `CF+3`
3. Shortcut opens confirm modal (`Enter` confirm, `Esc` cancel).
4. You can end or cancel active break from dashboard.
5. Break limits are per duty session (not per calendar day). Over-limit is soft: break still starts and a warning is shown.

### 4) Offline behavior
- Punch and break actions are queued if internet is down.
- Queued actions sync automatically when internet returns.
- Dashboard shows queue/failure indicators and retry options.

### 5) Requests
- Use `Requests` page for shift/day-off requests.
- Supported request types:
  - Half Day Morning
  - Half Day Evening
  - Full Day Off
  - Custom

### 6) Violation reporting (member)
- In dashboard, use `Report Violation`.
- Select accused user, reason, and optional note.
- Leaders do not see reporter identity.

### 7) Driver/Chef workflow
- Chef can submit meal pickup driver request.
- Request is allowed even if no drivers are currently available; it enters queue/pending flow.
- Driver handles assignments from driver dashboard.

### 8) Notifications
- Bell icon shows in-app notifications.
- If push is enabled and browser permission is granted, push notifications are also sent.

## Admin Guide

### 1) Main pages
- `Live`: active duty/break view.
- `History`: attendance history and reports.
- `Users`: user and team management + registration approvals.
- `Shifts`: shift preset/assignment management.
- `Requests`: shift requests, driver requests, violation review/finalization.

### 2) Users page
- Create user directly (role/team/password options).
- Edit user role, team, active status, and password.
- Delete user (hard delete with related cleanup).
- Review registration requests and approve/reject.

### 3) Shifts page
- Create multi-segment shift presets.
- Assign preset to team or specific user with effective date.
- Delete preset only if it is not in active/future use.

### 4) Requests page
- Shift tab:
  - approve/reject shift requests
- Driver tab:
  - review driver requests
  - assign driver and approve/reject
  - view driver availability
- Violation tab:
  - review member/leader/admin cases
  - finalize as confirmed/rejected
  - apply point entries (reward/deduction)
  - export points CSV

### 5) Notifications
- Admin receives unified bell notifications for:
  - registration requests
  - driver requests updates
  - shift requests updates
  - violations create/triage/finalize

## Quick FAQ

Q: I forgot my password.  
A: Admin can reset from Users page.

Q: I punched wrongly.  
A: Ask admin/leader to review and correct via admin workflows.

Q: Can users change their own display info?  
A: Yes, from profile page. Team/role changes are admin-only.
