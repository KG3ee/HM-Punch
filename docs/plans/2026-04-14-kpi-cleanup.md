# KPI Card Cleanup Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove redundant KPI cards and make all remaining cards clickable navigation shortcuts.

**Architecture:** Pure frontend changes — remove JSX for dead KPIs, wrap remaining `<article className="kpi">` elements with `onClick` + `router.push()`, add CSS for clickable KPI affordance.

**Tech Stack:** React (Next.js), CSS design tokens, `useRouter` from `next/navigation`

---

### Task 1: Add clickable KPI CSS affordance

**Files:**
- Modify: `apps/web/src/app/globals.css:1093-1144` (`.kpi` rules)

**Step 1: Add `.kpi-link` class**

After `.kpi-label` rules (line 1144), add:

```css
.kpi.kpi-link {
  cursor: pointer;
}

.kpi.kpi-link:hover {
  border-color: var(--brand);
}

.kpi.kpi-link::after {
  content: '→';
  position: absolute;
  top: var(--space-2);
  right: var(--space-2);
  font-size: var(--text-xs);
  color: var(--muted);
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.kpi.kpi-link:hover::after {
  opacity: 1;
  color: var(--brand);
}
```

**Step 2: Commit**

```bash
git add apps/web/src/app/globals.css
git commit -m "style: add .kpi-link class for clickable KPI cards"
```

---

### Task 2: Clean up Employee Dashboard KPIs

**Files:**
- Modify: `apps/web/src/app/employee/dashboard/page.tsx:1493-1544`

**Step 1: Make Monthly KPI row clickable (lines 1495-1512)**

The monthly KPI section has Month Hours, Month Late, Overtime. Page already has `useRouter`. Wrap each `<article>` with `onClick` and add `kpi-link` class. Admin goes to `/admin/history`, members go to `/employee/requests`:

```tsx
{monthlySummary && me?.role !== 'MAID' && me?.role !== 'CHEF' ? (
  <section className="kpi-grid">
    <article className="kpi kpi-link card-animate card-animate-delay-1"
      onClick={() => router.push(me?.role === 'ADMIN' ? '/admin/history' : '/employee/requests')}>
      <p className="kpi-label">Month Hours</p>
      <p className="kpi-value">{fmtDuration(monthlySummary.totalWorkedMinutes)}</p>
    </article>
    <article className="kpi kpi-link card-animate card-animate-delay-2"
      onClick={() => router.push(me?.role === 'ADMIN' ? '/admin/history' : '/employee/requests')}>
      <p className="kpi-label">Month Late</p>
      <p className="kpi-value" style={{ color: monthlySummary.totalLateMinutes > 0 ? 'var(--danger)' : undefined }}>
        {monthlySummary.totalLateMinutes}m
      </p>
    </article>
    <article className="kpi kpi-link card-animate card-animate-delay-3"
      onClick={() => router.push(me?.role === 'ADMIN' ? '/admin/history' : '/employee/requests')}>
      <p className="kpi-label">Overtime</p>
      <p className="kpi-value" style={{ color: monthlySummary.totalOvertimeMinutes > 0 ? 'var(--ok)' : undefined }}>
        {monthlySummary.totalOvertimeMinutes}m
      </p>
    </article>
  </section>
) : null}
```

**Step 2: Replace Today KPI section (lines 1516-1544)**

Remove Sessions and Break KPIs. Keep Duty and Late, make them clickable:

```tsx
<section className={`kpi-grid${me?.role === 'DRIVER' || me?.role === 'MAID' || me?.role === 'CHEF' ? ' kpi-mobile-first' : ''}`}>
  <article className="kpi kpi-link card-animate card-animate-delay-1"
    onClick={() => {
      document.getElementById('current-session')?.scrollIntoView({ behavior: 'smooth' });
    }}>
    <p className="kpi-label">Duty</p>
    <p className="kpi-value" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
      <span className={`status-dot ${activeSession ? 'active' : 'inactive'}`} />
      {activeSession ? fmtDuration(activeDutyMinutes) : 'Off'}
    </p>
  </article>
  {activeSession?.isLate && me?.role !== 'MAID' && me?.role !== 'CHEF' ? (
    <article className="kpi kpi-link card-animate card-animate-delay-2"
      onClick={() => router.push('/employee/requests')}>
      <p className="kpi-label">Late</p>
      <p className="kpi-value" style={{ color: 'var(--danger)' }}>{activeSession.lateMinutes}m</p>
    </article>
  ) : null}
</section>
```

**Step 3: Add `id="current-session"` to the Current Session section**

Find the Current Session `<article>` in the right column and add `id="current-session"` to it so the Duty KPI scroll target works.

**Step 4: Commit**

```bash
git add apps/web/src/app/employee/dashboard/page.tsx
git commit -m "feat: clean up employee KPIs — remove Break/Sessions, make rest clickable"
```

---

### Task 3: Clean up Admin Live Dashboard KPIs

**Files:**
- Modify: `apps/web/src/app/admin/live/page.tsx:831-873`

**Step 1: Replace KPI section**

Remove Date and Total Today. Make Active Now and Late clickable. Keep Requests and Signups as-is (already clickable):

```tsx
{/* ═══ KPIs ═══ */}
<section className="kpi-grid">
  <article className="kpi kpi-link"
    onClick={() => router.push('/admin/history')}>
    <p className="kpi-label">Active Now</p>
    <p className="kpi-value" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
      {(data?.activeDutySessions.length || 0) > 0 && <span className="status-dot active" />}
      {data?.activeDutySessions.length || 0}
    </p>
  </article>
  <article className="kpi kpi-link"
    onClick={() => router.push('/admin/deductions')}>
    <p className="kpi-label">Late</p>
    <p className="kpi-value" style={{ color: (data?.summary.totalLateMinutesToday || 0) > 0 ? 'var(--danger)' : undefined }}>
      {data?.summary.totalLateMinutesToday || 0}m
    </p>
  </article>
  <article
    className={`kpi${totalPending > 0 ? ' kpi-link' : ''}`}
    onClick={() => { if (totalPending > 0) router.push('/admin/requests'); }}
  >
    <p className="kpi-label">Requests</p>
    <p className="kpi-value" style={{ color: totalPending > 0 ? 'var(--danger)' : undefined }}>
      {totalPending}
    </p>
  </article>
  <article
    className={`kpi${pendingSignups > 0 ? ' kpi-link' : ''}`}
    onClick={() => { if (pendingSignups > 0) router.push('/admin/users?section=registrations'); }}
  >
    <p className="kpi-label">Signups</p>
    <p className="kpi-value" style={{ color: pendingSignups > 0 ? 'var(--warning)' : undefined }}>
      {pendingSignups}
    </p>
  </article>
</section>
```

**Step 2: Commit**

```bash
git add apps/web/src/app/admin/live/page.tsx
git commit -m "feat: clean up admin KPIs — remove Date/Total, make Active+Late clickable"
```

---

### Task 4: Clean up Leader Dashboard KPIs

**Files:**
- Modify: `apps/web/src/components/leader-dashboard.tsx:635-666,1052-1071`

**Step 1: Add `useRouter` import**

Add to imports at top of file:
```tsx
import { useRouter } from 'next/navigation';
```

Add inside the component function:
```tsx
const router = useRouter();
```

**Step 2: Replace Team KPI grid (lines 635-666)**

Remove Active and Total. Make Late, Requests, Violations clickable:

```tsx
{/* ═══ 2. TEAM KPIs ═══ */}
<section className="kpi-grid">
  <article className="kpi kpi-link"
    onClick={() => router.push('/employee/requests')}>
    <p className="kpi-label">Late</p>
    <p className="kpi-value" style={{ color: (liveData?.summary.totalLateMinutesToday || 0) > 0 ? 'var(--danger)' : undefined }}>
      {liveData?.summary.totalLateMinutesToday || 0}m
    </p>
  </article>
  <article className="kpi kpi-link"
    onClick={() => router.push('/employee/requests')}>
    <p className="kpi-label">Requests</p>
    <p className="kpi-value" style={{ color: pendingReqs.length > 0 ? 'var(--danger)' : undefined }}>
      {pendingReqs.length}
    </p>
  </article>
  <article className="kpi kpi-link"
    onClick={() => router.push('/employee/requests')}>
    <p className="kpi-label">Violations</p>
    <p className="kpi-value" style={{ color: pendingViolations.length > 0 ? 'var(--danger)' : undefined }}>
      {pendingViolations.length}
    </p>
  </article>
</section>
```

**Step 3: Make Personal Monthly KPIs clickable (lines 1053-1071)**

```tsx
{monthlySummary ? (
  <section className="kpi-grid" style={{ opacity: 0.8 }}>
    <article className="kpi kpi-link"
      onClick={() => router.push('/employee/requests')}>
      <p className="kpi-label">Month Hours</p>
      <p className="kpi-value" style={{ fontSize: '1rem' }}>{fmtDur(monthlySummary.totalWorkedMinutes)}</p>
    </article>
    <article className="kpi kpi-link"
      onClick={() => router.push('/employee/requests')}>
      <p className="kpi-label">Month Late</p>
      <p className="kpi-value" style={{ fontSize: '1rem', color: monthlySummary.totalLateMinutes > 0 ? 'var(--danger)' : undefined }}>
        {monthlySummary.totalLateMinutes}m
      </p>
    </article>
    <article className="kpi kpi-link"
      onClick={() => router.push('/employee/requests')}>
      <p className="kpi-label">Overtime</p>
      <p className="kpi-value" style={{ fontSize: '1rem', color: monthlySummary.totalOvertimeMinutes > 0 ? 'var(--ok)' : undefined }}>
        {monthlySummary.totalOvertimeMinutes}m
      </p>
    </article>
  </section>
) : null}
```

**Step 4: Commit**

```bash
git add apps/web/src/components/leader-dashboard.tsx
git commit -m "feat: clean up leader KPIs — remove Active/Total, make rest clickable"
```

---

### Task 5: TypeScript check + push to staging

**Step 1: Run TypeScript check**

```bash
./node_modules/.bin/tsc --noEmit --project apps/web/tsconfig.json
```

Expected: no errors.

**Step 2: Push**

```bash
git push origin codex/staging
```
