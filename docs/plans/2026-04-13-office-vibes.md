# Office Vibes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an ephemeral social layer to the live board — mood badges, public emoji reactions, and anonymous broadcast bubbles — all 1-to-all via Server-Sent Events.

**Architecture:** A new `VibesModule` (NestJS) exposes three REST endpoints (mood, reaction, bubble) and one SSE stream endpoint. All connected clients subscribe to the same event fan-out. The frontend `VibesProvider` (React context) opens the SSE connection and dispatches events to co-located components on the live board.

**Tech Stack:** NestJS `@Sse()` / `Observable` (rxjs), Prisma (two schema changes), Next.js App Router, React context + EventSource API.

---

## Background Reading

Before starting, skim these files for context:

- `apps/api/src/attendance/attendance.module.ts` — module registration pattern
- `apps/api/src/attendance/attendance.controller.ts` — controller/guard pattern
- `apps/api/src/app.module.ts` — where to register VibesModule
- `apps/api/prisma/schema.prisma` — DutySession and User models you will modify
- `apps/web/src/lib/api.ts` — apiFetch pattern used by all web API calls
- `apps/web/src/app/layout.tsx` — where to add VibesProvider
- `docs/plans/2026-04-13-office-vibes-design.md` — the full approved design

---

## Task 1: Prisma Schema — Add `mood` and `reactionPalette`

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Run: migration

**Step 1: Add fields to schema**

In `apps/api/prisma/schema.prisma`, find the `DutySession` model and add after the `note` field:

```prisma
  mood              String?   // nullable emoji, max 2 chars, cleared on punch-out
```

Find the `User` model and add after `vehicleInfo`:

```prisma
  reactionPalette   String[]  @default([])  // up to 6 emoji strings
```

**Step 2: Run migration**

```bash
cd apps/api
npx prisma migrate dev --name add_vibes_mood_palette
```

Expected: migration created and applied, `prisma generate` runs automatically.

**Step 3: Verify**

```bash
cd apps/api
npx prisma studio
```

Open DutySession table — confirm `mood` column exists. Open User table — confirm `reactionPalette` column exists. Ctrl+C to exit studio.

**Step 4: Commit**

```bash
git add apps/api/prisma/schema.prisma apps/api/prisma/migrations/
git commit -m "feat(vibes): add mood to DutySession and reactionPalette to User schema"
```

---

## Task 2: VibesService — Business Logic

**Files:**
- Create: `apps/api/src/vibes/vibes.service.ts`
- Create: `apps/api/src/vibes/vibes.service.spec.ts`

**Step 1: Write the failing tests first**

Create `apps/api/src/vibes/vibes.service.spec.ts`:

```typescript
import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { VibesService } from "./vibes.service";
import { PrismaService } from "../prisma/prisma.service";

const mockPrisma = {
  dutySession: { findFirst: jest.fn(), update: jest.fn() },
  user: { update: jest.fn() },
};

const mockUser = {
  id: "user-1",
  teamId: "team-1",
  displayName: "Alice",
  reactionPalette: ["🎉", "👍"],
};

describe("VibesService", () => {
  let service: VibesService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VibesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<VibesService>(VibesService);
  });

  describe("setMood", () => {
    it("updates mood on active session", async () => {
      mockPrisma.dutySession.update.mockResolvedValue({ id: "s1", mood: "🔥" });
      await service.setMood(mockUser as never, "🔥");
      expect(mockPrisma.dutySession.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { mood: "🔥" } }),
      );
    });

    it("throws BadRequestException when mood > 2 chars", async () => {
      await expect(service.setMood(mockUser as never, "ABC")).rejects.toThrow(BadRequestException);
    });

    it("allows null mood (clear)", async () => {
      mockPrisma.dutySession.update.mockResolvedValue({ id: "s1", mood: null });
      await service.setMood(mockUser as never, null);
      expect(mockPrisma.dutySession.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { mood: null } }),
      );
    });
  });

  describe("savePalette", () => {
    it("saves up to 6 emojis", async () => {
      const palette = ["🎉", "👍", "🔥", "💪", "😎", "🚀"];
      mockPrisma.user.update.mockResolvedValue({ id: "user-1", reactionPalette: palette });
      await service.savePalette(mockUser as never, palette);
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { reactionPalette: palette } }),
      );
    });

    it("throws BadRequestException when palette > 6 emojis", async () => {
      await expect(
        service.savePalette(mockUser as never, ["a", "b", "c", "d", "e", "f", "g"]),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("validateBubble", () => {
    it("accepts message <= 80 chars", () => {
      expect(() => service.validateBubble("Hello team!")).not.toThrow();
    });

    it("throws BadRequestException when message > 80 chars", () => {
      expect(() => service.validateBubble("x".repeat(81))).toThrow(BadRequestException);
    });

    it("throws BadRequestException for empty message", () => {
      expect(() => service.validateBubble("")).toThrow(BadRequestException);
    });
  });

  describe("checkBubbleRateLimit", () => {
    it("allows first bubble from a user", () => {
      expect(() => service.checkBubbleRateLimit("user-1")).not.toThrow();
    });

    it("throws ForbiddenException within 10-minute window", () => {
      service.checkBubbleRateLimit("user-2"); // first call
      expect(() => service.checkBubbleRateLimit("user-2")).toThrow(ForbiddenException);
    });
  });
});
```

**Step 2: Run test — expect FAIL (module not found)**

```bash
cd /path/to/modern-punch
npm run test:api -- --testPathPattern=vibes.service
```

Expected: FAIL — `Cannot find module './vibes.service'`

**Step 3: Implement VibesService**

Create `apps/api/src/vibes/vibes.service.ts`:

```typescript
import { BadRequestException, ForbiddenException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { User } from "@prisma/client";

@Injectable()
export class VibesService {
  // userId → timestamp of last bubble (in-memory, clears on restart)
  private readonly bubbleCooldowns = new Map<string, number>();

  constructor(private readonly prisma: PrismaService) {}

  async setMood(user: User, mood: string | null): Promise<void> {
    if (mood !== null && mood.length > 2) {
      throw new BadRequestException("Mood emoji must be 2 characters or fewer");
    }
    await this.prisma.dutySession.update({
      where: { id: await this.getActiveSessionId(user.id) },
      data: { mood },
    });
  }

  async savePalette(user: User, palette: string[]): Promise<void> {
    if (palette.length > 6) {
      throw new BadRequestException("Reaction palette cannot have more than 6 emojis");
    }
    await this.prisma.user.update({
      where: { id: user.id },
      data: { reactionPalette: palette },
    });
  }

  validateBubble(text: string): void {
    if (!text || text.trim().length === 0) {
      throw new BadRequestException("Bubble message cannot be empty");
    }
    if (text.length > 80) {
      throw new BadRequestException("Bubble message cannot exceed 80 characters");
    }
  }

  checkBubbleRateLimit(userId: string): void {
    const lastSent = this.bubbleCooldowns.get(userId);
    const tenMinutes = 10 * 60 * 1000;
    if (lastSent && Date.now() - lastSent < tenMinutes) {
      throw new ForbiddenException("You can only send one anonymous bubble every 10 minutes");
    }
    this.bubbleCooldowns.set(userId, Date.now());
  }

  private async getActiveSessionId(userId: string): Promise<string> {
    const session = await this.prisma.dutySession.findFirst({
      where: { userId, status: "ACTIVE" },
      select: { id: true },
    });
    if (!session) throw new ForbiddenException("No active duty session");
    return session.id;
  }
}
```

**Step 4: Run tests — expect PASS**

```bash
npm run test:api -- --testPathPattern=vibes.service
```

Expected: 8 tests PASS.

**Step 5: Commit**

```bash
git add apps/api/src/vibes/
git commit -m "feat(vibes): VibesService with mood, palette, bubble validation"
```

---

## Task 3: VibesGateway — SSE Controller

**Files:**
- Create: `apps/api/src/vibes/vibes.gateway.ts`
- Create: `apps/api/src/vibes/vibes.module.ts`
- Modify: `apps/api/src/app.module.ts`

**Step 1: Create the SSE gateway**

Create `apps/api/src/vibes/vibes.gateway.ts`:

```typescript
import {
  Controller,
  Post,
  Patch,
  Body,
  Sse,
  MessageEvent,
  UseGuards,
  HttpCode,
} from "@nestjs/common";
import { Observable, Subject } from "rxjs";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CsrfGuard } from "../common/guards/csrf.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { VibesService } from "./vibes.service";
import { User } from "@prisma/client";

@Controller("vibes")
@UseGuards(JwtAuthGuard)
export class VibesGateway {
  // Shared subject — all SSE clients subscribe to this
  private readonly events$ = new Subject<MessageEvent>();

  constructor(private readonly vibesService: VibesService) {}

  @Sse("stream")
  stream(): Observable<MessageEvent> {
    // Each client gets the same shared observable
    return this.events$.asObservable();
  }

  @Patch("mood")
  @UseGuards(CsrfGuard)
  @HttpCode(204)
  async setMood(
    @CurrentUser() user: User,
    @Body("mood") mood: string | null,
  ): Promise<void> {
    await this.vibesService.setMood(user, mood ?? null);
    this.events$.next({
      data: JSON.stringify({ type: "mood:updated", userId: user.id, mood: mood ?? null }),
    });
  }

  @Post("reaction")
  @UseGuards(CsrfGuard)
  @HttpCode(204)
  async sendReaction(
    @CurrentUser() user: User,
    @Body("emoji") emoji: string,
  ): Promise<void> {
    this.events$.next({
      data: JSON.stringify({ type: "reaction", emoji, fromDisplayName: user.displayName }),
    });
  }

  @Post("bubble")
  @UseGuards(CsrfGuard)
  @HttpCode(204)
  async sendBubble(
    @CurrentUser() user: User,
    @Body("text") text: string,
  ): Promise<void> {
    this.vibesService.validateBubble(text);
    this.vibesService.checkBubbleRateLimit(user.id);
    // NOTE: user.id is deliberately NOT included in the event payload
    this.events$.next({
      data: JSON.stringify({ type: "bubble", text }),
    });
  }

  @Patch("palette")
  @UseGuards(CsrfGuard)
  @HttpCode(204)
  async savePalette(
    @CurrentUser() user: User,
    @Body("palette") palette: string[],
  ): Promise<void> {
    await this.vibesService.savePalette(user, palette);
  }
}
```

**Step 2: Create VibesModule**

Create `apps/api/src/vibes/vibes.module.ts`:

```typescript
import { Module } from "@nestjs/common";
import { VibesGateway } from "./vibes.gateway";
import { VibesService } from "./vibes.service";
import { PrismaModule } from "../prisma/prisma.module";
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule, ConfigService } from "@nestjs/config";

@Module({
  imports: [
    PrismaModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>("JWT_SECRET"),
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [VibesGateway],
  providers: [VibesService],
  exports: [VibesService],
})
export class VibesModule {}
```

**Step 3: Register in AppModule**

In `apps/api/src/app.module.ts`, import and add `VibesModule`:

```typescript
import { VibesModule } from "./vibes/vibes.module";

// inside @Module imports array, add:
VibesModule,
```

**Step 4: Build to verify no compile errors**

```bash
npm run build --workspace @modern-punch/api
```

Expected: BUILD SUCCESSFUL, no TypeScript errors.

**Step 5: Commit**

```bash
git add apps/api/src/vibes/ apps/api/src/app.module.ts
git commit -m "feat(vibes): VibesGateway SSE controller with mood/reaction/bubble endpoints"
```

---

## Task 4: Clear Mood on Punch-Out

**Files:**
- Modify: `apps/api/src/attendance/attendance.service.ts`
- Modify: `apps/api/src/attendance/attendance.service.spec.ts`

**Step 1: Write failing test**

In `apps/api/src/attendance/attendance.service.spec.ts`, add inside the `punchOff` describe block:

```typescript
it("clears mood on punch-out", async () => {
  process.env.APP_TIMEZONE = "Asia/Dubai";

  await service.punchOff(mockUser as never, {
    clientTimestamp: SERVER_NOW.toISOString(),
  });

  expect(mockTx.dutySession.update).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({ mood: null }),
    }),
  );
});
```

**Step 2: Run — expect FAIL**

```bash
npm run test:api -- --testPathPattern=attendance.service
```

Expected: FAIL — `mood: null` not found in update call.

**Step 3: Update punchOff to clear mood**

In `apps/api/src/attendance/attendance.service.ts`, find the `tx.dutySession.update` call inside `punchOff`. Add `mood: null` to the `data` object:

```typescript
await tx.dutySession.update({
  where: { id: activeSession.id },
  data: {
    status: DutySessionStatus.CLOSED,
    punchedOffAt: now,
    mood: null,   // ← add this line
    // ...rest of existing data fields
  },
});
```

**Step 4: Run — expect PASS**

```bash
npm run test:api -- --testPathPattern=attendance.service
```

Expected: All tests PASS including the new one.

**Step 5: Commit**

```bash
git add apps/api/src/attendance/attendance.service.ts apps/api/src/attendance/attendance.service.spec.ts
git commit -m "feat(vibes): clear mood emoji automatically on punch-out"
```

---

## Task 5: VibesProvider — SSE Client (Next.js)

**Files:**
- Create: `apps/web/src/components/vibes/VibesProvider.tsx`
- Modify: `apps/web/src/app/layout.tsx`

**Step 1: Create VibesProvider**

Create `apps/web/src/components/vibes/VibesProvider.tsx`:

```tsx
"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";

export type VibeEvent =
  | { type: "mood:updated"; userId: string; mood: string | null }
  | { type: "reaction"; emoji: string; fromDisplayName: string }
  | { type: "bubble"; text: string };

interface VibesContextValue {
  latestEvent: VibeEvent | null;
}

const VibesContext = createContext<VibesContextValue>({ latestEvent: null });

export function VibesProvider({ children }: { children: ReactNode }) {
  const [latestEvent, setLatestEvent] = useState<VibeEvent | null>(null);

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
    const es = new EventSource(`${apiUrl}/vibes/stream`, { withCredentials: true });

    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data) as VibeEvent;
        setLatestEvent(event);
      } catch {
        // ignore malformed events
      }
    };

    es.onerror = () => {
      // EventSource auto-reconnects on error — no action needed
    };

    return () => es.close();
  }, []);

  return (
    <VibesContext.Provider value={{ latestEvent }}>
      {children}
    </VibesContext.Provider>
  );
}

export function useVibes() {
  return useContext(VibesContext);
}
```

**Step 2: Add VibesProvider to root layout**

In `apps/web/src/app/layout.tsx`, wrap `{children}` with `VibesProvider`:

```tsx
import { VibesProvider } from "@/components/vibes/VibesProvider";

// inside the return, wrap children:
<VibesProvider>
  {children}
</VibesProvider>
```

**Step 3: Build web to verify no TypeScript errors**

```bash
npm run build --workspace @modern-punch/web
```

Expected: BUILD SUCCESSFUL.

**Step 4: Commit**

```bash
git add apps/web/src/components/vibes/ apps/web/src/app/layout.tsx
git commit -m "feat(vibes): VibesProvider SSE client context for web"
```

---

## Task 6: MoodBadge + MoodPicker Components

**Files:**
- Create: `apps/web/src/components/vibes/MoodBadge.tsx`
- Create: `apps/web/src/components/vibes/MoodPicker.tsx`

**Step 1: Create MoodBadge**

Create `apps/web/src/components/vibes/MoodBadge.tsx`:

```tsx
interface MoodBadgeProps {
  mood: string | null;
  size?: "sm" | "md";
}

export function MoodBadge({ mood, size = "sm" }: MoodBadgeProps) {
  if (!mood) return null;
  const sizeClass = size === "sm" ? "text-xs" : "text-base";
  return (
    <span
      className={`absolute -bottom-1 -right-1 ${sizeClass} leading-none select-none`}
      aria-label={`Mood: ${mood}`}
    >
      {mood}
    </span>
  );
}
```

**Step 2: Create MoodPicker**

Create `apps/web/src/components/vibes/MoodPicker.tsx`:

```tsx
"use client";

import { useState } from "react";

const QUICK_MOODS = ["😊", "🔥", "😴", "💪", "🤔", "😎", "🙏", "🎯"];

interface MoodPickerProps {
  currentMood: string | null;
  onSelect: (mood: string | null) => void;
}

export function MoodPicker({ currentMood, onSelect }: MoodPickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-lg leading-none"
        aria-label="Set mood"
      >
        {currentMood ?? "🙂"}
      </button>

      {open && (
        <div className="absolute z-50 bottom-8 left-0 bg-base-200 rounded-box p-2 flex flex-wrap gap-1 w-40 shadow-lg">
          {QUICK_MOODS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => { onSelect(emoji); setOpen(false); }}
              className="text-xl hover:scale-125 transition-transform"
            >
              {emoji}
            </button>
          ))}
          <button
            onClick={() => { onSelect(null); setOpen(false); }}
            className="text-xs text-base-content/50 w-full text-center mt-1"
          >
            Clear mood
          </button>
        </div>
      )}
    </div>
  );
}
```

**Step 3: Wire MoodPicker to API**

In `apps/web/src/lib/api.ts`, add the mood helper (or wherever API calls live):

```typescript
export async function setMood(mood: string | null): Promise<void> {
  await apiFetch("/vibes/mood", {
    method: "PATCH",
    body: JSON.stringify({ mood }),
  });
}
```

**Step 4: Build web**

```bash
npm run build --workspace @modern-punch/web
```

Expected: BUILD SUCCESSFUL.

**Step 5: Commit**

```bash
git add apps/web/src/components/vibes/MoodBadge.tsx apps/web/src/components/vibes/MoodPicker.tsx apps/web/src/lib/api.ts
git commit -m "feat(vibes): MoodBadge and MoodPicker components"
```

---

## Task 7: ReactionFloat Component

**Files:**
- Create: `apps/web/src/components/vibes/ReactionFloat.tsx`
- Create: `apps/web/src/components/vibes/ReactionPalette.tsx`

**Step 1: Create ReactionFloat**

Create `apps/web/src/components/vibes/ReactionFloat.tsx`:

```tsx
"use client";

import { useEffect, useState, useRef } from "react";
import { useVibes } from "./VibesProvider";

interface FloatingEmoji {
  id: number;
  emoji: string;
  x: number;
}

export function ReactionFloat() {
  const { latestEvent } = useVibes();
  const [floaters, setFloaters] = useState<FloatingEmoji[]>([]);
  const counter = useRef(0);

  useEffect(() => {
    if (latestEvent?.type !== "reaction") return;
    const id = ++counter.current;
    const x = Math.random() * 80 + 10; // 10–90% horizontal
    setFloaters((prev) => [...prev, { id, emoji: latestEvent.emoji, x }]);
    setTimeout(() => {
      setFloaters((prev) => prev.filter((f) => f.id !== id));
    }, 3000);
  }, [latestEvent]);

  return (
    <div className="pointer-events-none fixed inset-0 z-50">
      {floaters.map(({ id, emoji, x }) => (
        <span
          key={id}
          className="absolute text-4xl animate-bounce"
          style={{ left: `${x}%`, bottom: "20%", animationDuration: "0.5s" }}
        >
          {emoji}
        </span>
      ))}
    </div>
  );
}
```

**Step 2: Create ReactionPalette**

Create `apps/web/src/components/vibes/ReactionPalette.tsx`:

```tsx
"use client";

interface ReactionPaletteProps {
  palette: string[];
  onReact: (emoji: string) => void;
}

export function ReactionPalette({ palette, onReact }: ReactionPaletteProps) {
  if (palette.length === 0) return null;
  return (
    <div className="flex gap-1 bg-base-200 rounded-full px-2 py-1 shadow-md">
      {palette.map((emoji) => (
        <button
          key={emoji}
          onClick={() => onReact(emoji)}
          className="text-xl hover:scale-125 transition-transform active:scale-95"
          aria-label={`React with ${emoji}`}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
```

**Step 3: Add `ReactionFloat` to the live board layout**

Find the existing live board component (likely `apps/web/src/components/leader-dashboard.tsx` or a live-board page). Import and render `<ReactionFloat />` at the root of that component so it overlays the screen.

**Step 4: Build**

```bash
npm run build --workspace @modern-punch/web
```

**Step 5: Commit**

```bash
git add apps/web/src/components/vibes/ReactionFloat.tsx apps/web/src/components/vibes/ReactionPalette.tsx
git commit -m "feat(vibes): ReactionFloat overlay and ReactionPalette hover component"
```

---

## Task 8: BubbleButton + BubbleBanner Components

**Files:**
- Create: `apps/web/src/components/vibes/BubbleButton.tsx`
- Create: `apps/web/src/components/vibes/BubbleBanner.tsx`

**Step 1: Create BubbleBanner**

Create `apps/web/src/components/vibes/BubbleBanner.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { useVibes } from "./VibesProvider";

interface Banner {
  id: number;
  text: string;
}

export function BubbleBanner() {
  const { latestEvent } = useVibes();
  const [banners, setBanners] = useState<Banner[]>([]);
  let counter = 0;

  useEffect(() => {
    if (latestEvent?.type !== "bubble") return;
    const id = ++counter;
    setBanners((prev) => [...prev, { id, text: latestEvent.text }]);
    setTimeout(() => {
      setBanners((prev) => prev.filter((b) => b.id !== id));
    }, 60_000);
  }, [latestEvent]);

  return (
    <div className="pointer-events-none fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 items-center">
      {banners.map(({ id, text }) => (
        <div
          key={id}
          className="bg-base-300 text-base-content px-4 py-2 rounded-full shadow-lg text-sm max-w-xs text-center"
        >
          📢 {text}
        </div>
      ))}
    </div>
  );
}
```

**Step 2: Create BubbleButton**

Create `apps/web/src/components/vibes/BubbleButton.tsx`:

```tsx
"use client";

import { useState } from "react";

interface BubbleButtonProps {
  isPunchedIn: boolean;
  onSend: (text: string) => Promise<void>;
}

export function BubbleButton({ isPunchedIn, onSend }: BubbleButtonProps) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isPunchedIn) return null;

  async function handleSend() {
    if (!text.trim()) return;
    setSending(true);
    setError(null);
    try {
      await onSend(text.trim());
      setText("");
      setOpen(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to send");
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="btn btn-circle btn-ghost text-2xl"
        aria-label="Send anonymous bubble"
        title="Send anonymous message to team"
      >
        📢
      </button>

      {open && (
        <dialog open className="modal modal-bottom sm:modal-middle">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-2">Anonymous Bubble</h3>
            <p className="text-sm text-base-content/60 mb-3">
              Your message will appear on the live board for 60 seconds. No name attached.
            </p>
            <textarea
              className="textarea textarea-bordered w-full"
              maxLength={80}
              rows={3}
              placeholder="What's on your mind? (max 80 chars)"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <div className="text-xs text-right text-base-content/40">{text.length}/80</div>
            {error && <p className="text-error text-sm mt-1">{error}</p>}
            <div className="modal-action">
              <button className="btn" onClick={() => setOpen(false)}>Cancel</button>
              <button
                className="btn btn-primary"
                disabled={!text.trim() || sending}
                onClick={handleSend}
              >
                {sending ? "Sending..." : "Send"}
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop" onClick={() => setOpen(false)} />
        </dialog>
      )}
    </>
  );
}
```

**Step 3: Add BubbleBanner to layout**

In `apps/web/src/app/layout.tsx` (or a root shell component), add `<BubbleBanner />` alongside `<ReactionFloat />` so bubbles appear globally.

**Step 4: Build**

```bash
npm run build --workspace @modern-punch/web
```

**Step 5: Commit**

```bash
git add apps/web/src/components/vibes/
git commit -m "feat(vibes): BubbleButton compose modal and BubbleBanner 60s display"
```

---

## Task 9: PaletteSettings Component (Profile Page)

**Files:**
- Create: `apps/web/src/components/vibes/PaletteSettings.tsx`
- Modify: appropriate profile settings page (find via `apps/web/src/app/employee/`)

**Step 1: Create PaletteSettings**

Create `apps/web/src/components/vibes/PaletteSettings.tsx`:

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

  function toggle(emoji: string) {
    setPalette((prev) =>
      prev.includes(emoji)
        ? prev.filter((e) => e !== emoji)
        : prev.length < 6
        ? [...prev, emoji]
        : prev,
    );
  }

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(palette);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-base-content/60">
        Pick up to 6 emojis for your reaction palette. These appear when teammates hover your avatar.
      </p>
      <div className="flex flex-wrap gap-2">
        {EMOJI_SUGGESTIONS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => toggle(emoji)}
            className={`text-2xl p-1 rounded transition-all ${
              palette.includes(emoji) ? "ring-2 ring-primary scale-110" : "opacity-50"
            }`}
          >
            {emoji}
          </button>
        ))}
      </div>
      <p className="text-xs text-base-content/40">Selected: {palette.join(" ")} ({palette.length}/6)</p>
      <button className="btn btn-sm btn-primary" disabled={saving} onClick={handleSave}>
        {saving ? "Saving..." : "Save palette"}
      </button>
    </div>
  );
}
```

**Step 2: Add to profile/settings page**

Find the profile settings page (likely under `apps/web/src/app/employee/`). Import `PaletteSettings` and render it in a new "Reaction Palette" section.

**Step 3: Add API helper**

In `apps/web/src/lib/api.ts`:

```typescript
export async function savePalette(palette: string[]): Promise<void> {
  await apiFetch("/vibes/palette", {
    method: "PATCH",
    body: JSON.stringify({ palette }),
  });
}

export async function sendReaction(emoji: string): Promise<void> {
  await apiFetch("/vibes/reaction", {
    method: "POST",
    body: JSON.stringify({ emoji }),
  });
}

export async function sendBubble(text: string): Promise<void> {
  await apiFetch("/vibes/bubble", {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}
```

**Step 4: Build and verify**

```bash
npm run build --workspace @modern-punch/web
npm run test:api
```

Expected: all tests green, no build errors.

**Step 5: Commit**

```bash
git add apps/web/src/components/vibes/PaletteSettings.tsx apps/web/src/lib/api.ts
git commit -m "feat(vibes): PaletteSettings component + full vibe API helpers"
```

---

## Task 10: Wire Live Board Avatars

**Files:**
- Modify: `apps/web/src/components/leader-dashboard.tsx` (or equivalent live board)

**Step 1: Read the existing live board component**

```bash
cat apps/web/src/components/leader-dashboard.tsx
```

Identify where each user's avatar is rendered.

**Step 2: Update each avatar to show MoodBadge + ReactionPalette**

In the avatar section, wrap with a `group` div and add hover-reveal `ReactionPalette`:

```tsx
import { MoodBadge } from "@/components/vibes/MoodBadge";
import { ReactionPalette } from "@/components/vibes/ReactionPalette";
import { sendReaction } from "@/lib/api";

// In the avatar render:
<div className="relative group">
  {/* existing avatar image/initials */}
  <MoodBadge mood={member.currentMood ?? null} />

  {/* Reaction palette pops on hover */}
  <div className="absolute -top-12 left-1/2 -translate-x-1/2 hidden group-hover:flex z-40">
    <ReactionPalette
      palette={member.reactionPalette ?? []}
      onReact={(emoji) => sendReaction(emoji)}
    />
  </div>
</div>
```

**Note:** The live board API response will need to include `currentMood` and `reactionPalette` per user. Update the live board endpoint (`GET /attendance/live/board`) to include these fields from the active DutySession and User.

**Step 3: Update live board API to return mood + palette**

In `apps/api/src/attendance/attendance.service.ts`, find the `getLiveBoard` method. Ensure the `dutySession` select includes `mood`, and the `user` select includes `reactionPalette`.

**Step 4: Build + manual test**

```bash
npm run dev
```

Open two browser windows, punch in on both. Hover an avatar on the live board — palette should appear. Click an emoji — it should float on both screens.

**Step 5: Commit**

```bash
git add apps/web/src/components/ apps/api/src/attendance/
git commit -m "feat(vibes): wire live board avatars with MoodBadge and ReactionPalette"
```

---

## Task 11: End-to-End Manual Test + Push to Staging

**Checklist:**

- [ ] Two users punch in → both appear on live board with mood badges
- [ ] User A sets mood "🔥" → updates instantly on User B's board without refresh
- [ ] User B hovers User A's avatar → palette pops up → clicks emoji → emoji floats on both screens for ~3 sec
- [ ] User A sends anonymous bubble → banner appears on User B's board for 60 sec with no name
- [ ] User A tries second bubble within 10 min → gets error toast
- [ ] User A punches out → mood badge disappears from live board
- [ ] Disconnect test: close tab → reopen → SSE reconnects automatically

**Push to staging:**

```bash
git push origin codex/staging
```

Watch Dokploy deploy. Run checklist on staging URL. If green → merge to main.

---

## Summary of All New Files

```
apps/api/src/vibes/
  vibes.module.ts
  vibes.gateway.ts
  vibes.service.ts
  vibes.service.spec.ts

apps/web/src/components/vibes/
  VibesProvider.tsx
  MoodBadge.tsx
  MoodPicker.tsx
  ReactionPalette.tsx
  ReactionFloat.tsx
  BubbleButton.tsx
  BubbleBanner.tsx
  PaletteSettings.tsx
```
