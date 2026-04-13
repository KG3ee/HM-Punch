import { BadRequestException, ForbiddenException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { User } from "@prisma/client";

@Injectable()
export class VibesService {
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
