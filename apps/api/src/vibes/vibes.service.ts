import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { DutySessionStatus, Prisma, Role, User } from "@prisma/client";

/** Roles that don't participate in vibes (mood, reactions). */
const VIBES_EXCLUDED_ROLES: Set<Role> = new Set([Role.CHEF, Role.DRIVER, Role.MAID]);

@Injectable()
export class VibesService {
  private readonly bubbleCooldowns = new Map<string, number>();

  constructor(private readonly prisma: PrismaService) {}

  /** Return userId → mood for all active duty sessions that have a mood set. */
  async getActiveMoods(): Promise<Record<string, string | null>> {
    const sessions = await this.prisma.dutySession.findMany({
      where: {
        status: DutySessionStatus.ACTIVE,
        mood: { not: null },
        user: { role: { notIn: [...VIBES_EXCLUDED_ROLES] } },
      },
      select: { userId: true, mood: true },
    });
    const map: Record<string, string | null> = {};
    for (const s of sessions) {
      map[s.userId] = s.mood;
    }
    return map;
  }

  async setMood(user: User, mood: string | null): Promise<void> {
    if (VIBES_EXCLUDED_ROLES.has(user.role)) {
      throw new ForbiddenException("Vibes are not available for your role");
    }
    if (mood !== null && mood.length > 2) {
      throw new BadRequestException("Mood emoji must be 2 characters or fewer");
    }
    try {
      await this.prisma.dutySession.update({
        where: { id: await this.getActiveSessionId(user.id) },
        data: { mood },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
        throw new NotFoundException("Duty session no longer exists");
      }
      throw e;
    }
  }

  async savePalette(user: User, palette: string[]): Promise<void> {
    if (palette.length > 6) {
      throw new BadRequestException("Reaction palette cannot have more than 6 emojis");
    }
    try {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { reactionPalette: palette },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
        throw new NotFoundException("User no longer exists");
      }
      throw e;
    }
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
      where: { userId, status: DutySessionStatus.ACTIVE },
      select: { id: true },
    });
    if (!session) throw new ForbiddenException("No active duty session");
    return session.id;
  }
}
