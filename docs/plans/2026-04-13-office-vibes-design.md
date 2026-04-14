# Office Vibes — Design Document

**Date:** 2026-04-13  
**Status:** Approved  
**Scope:** Interactive social layer for the live board (team size 15–50)

---

## 1. Goals & Constraints

- Make the dashboard feel alive and fun without adding management overhead.
- **Zero private messaging.** All social interactions are 1-to-all, visible on the live board only.
- Everything is ephemeral — nothing is stored except the current mood emoji (cleared on punch-out).
- No office drama surface: no DMs, no 1-to-1 targeting, no notification inboxes.

---

## 2. Architecture

### Transport

Server-Sent Events (SSE) over a single authenticated endpoint:

```
GET /api/vibes/stream
Authorization: Bearer <jwt>
```

All connected clients receive all vibe events in real time. The server fans out each event to every open SSE connection.

### Event Types

| Type | Payload | Stored? | TTL |
|------|---------|---------|-----|
| `reaction` | `{ emoji, fromUserId, fromDisplayName }` | No | 3 s (client) |
| `bubble` | `{ text }` | No | 60 s (client) |
| `mood:updated` | `{ userId, mood }` | Yes — `mood` on `DutySession` | Until punch-out |

No sender identity is included in `bubble` events. `fromUserId` in `reaction` is used only to animate the source avatar; the display is still public/broadcast.

### Backend Components

- **`VibesGateway`** — SSE controller, manages connection registry, fans out events.
- **`VibesService`** — business logic: rate limiting, character-length validation, mood persistence.
- **`VibesModule`** — wires gateway + service + `PrismaService`.

### Schema Change

```prisma
model DutySession {
  // ...existing fields...
  mood  String?   // nullable emoji character, max 2 chars
}
```

---

## 3. Features

### 3.1 Mood Status

- Set at punch-in (optional) or changed any time during the shift by clicking the avatar on the dashboard.
- Up to 2 characters (emoji safe).
- Auto-cleared to `null` on punch-out (handled inside `AttendanceService.punchOff`).
- Shown as a small badge on the user's avatar on the live board.
- Triggers a `mood:updated` SSE event so all clients update instantly.

**API:**
```
PATCH /api/vibes/mood
Body: { mood: "🔥" | null }
```

### 3.2 Reaction Palette

- Each user configures up to **6 emojis** as their personal reaction palette in Profile Settings.
- Stored as a JSON array on the `User` model: `reactionPalette String[] @default([])`.
- On the live board: hover over a colleague's avatar → their palette pops up → click an emoji → that emoji floats publicly across the live board for **3 seconds**.
- No recipient notification. The emoji is broadcast to all connected clients.
- Rate limit: **10 reactions per user per minute** (in-memory, per-SSE-connection).

**API:**
```
POST /api/vibes/reaction
Body: { emoji: "🎉" }
```

**SSE event received by all clients:**
```json
{ "type": "reaction", "emoji": "🎉", "fromDisplayName": "Alice" }
```

### 3.3 Anonymous Bubble

- 📢 button visible only when the user is currently punched in.
- **80 character limit**, displayed as a floating banner on the live board for **60 seconds**.
- **1 bubble per user per 10 minutes** (rate-limited server-side, tracked in memory by userId — userId is NOT sent to clients).
- The server validates the message then broadcasts `{ type: "bubble", text: "..." }` — no sender field.
- No storage of message content or sender identity.

**API:**
```
POST /api/vibes/bubble
Body: { text: "Who moved my lunch?!" }
```

---

## 4. Frontend Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `VibesProvider` | `app/layout.tsx` | Opens SSE connection, exposes context |
| `MoodBadge` | `components/vibes/MoodBadge` | Emoji badge on avatars |
| `MoodPicker` | `components/vibes/MoodPicker` | Click-to-change mood modal |
| `ReactionPalette` | `components/vibes/ReactionPalette` | Hover palette pop-up on live board avatars |
| `ReactionFloat` | `components/vibes/ReactionFloat` | Floating emoji animation (3 s) |
| `BubbleButton` | `components/vibes/BubbleButton` | 📢 compose button (punched-in only) |
| `BubbleBanner` | `components/vibes/BubbleBanner` | Floating anonymous message banner (60 s) |
| `PaletteSettings` | `components/vibes/PaletteSettings` | Up-to-6-emoji palette editor in Profile |

SSE events are consumed in `VibesProvider` and dispatched to each component via React context + state.

---

## 5. Error Handling

| Scenario | Behavior |
|----------|----------|
| SSE connection drops | Client auto-reconnects with `EventSource` retry (browser-native) |
| Rate limit exceeded | `429 Too Many Requests` — client shows brief toast |
| Bubble > 80 chars | `400 Bad Request` — client prevents submit |
| Mood > 2 chars | `400 Bad Request` |
| User not punched in attempts bubble | `403 Forbidden` |

---

## 6. Testing

- **Unit:** `VibesService` — mood persistence, rate-limit logic, bubble validation.
- **Integration:** SSE endpoint — fan-out to multiple mock clients, rate-limit enforcement.
- **E2E (manual):** Open two browser windows, confirm reactions float on both; confirm bubble anonymity.

---

## 7. Out of Scope

- Push notifications / mobile badges
- Reaction history or analytics
- Private / 1-to-1 messages of any kind
- Emoji reactions on past punch records
- Threaded comments
