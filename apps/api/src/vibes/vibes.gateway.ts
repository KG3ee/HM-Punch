import {
  Controller,
  Get,
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
import { AuthUser } from "../common/interfaces/auth-user.interface";
import { User } from "@prisma/client";

@Controller("vibes")
@UseGuards(JwtAuthGuard)
export class VibesGateway {
  private readonly events$ = new Subject<MessageEvent>();

  constructor(private readonly vibesService: VibesService) {}

  @Get("moods")
  async getMoods(): Promise<Record<string, string | null>> {
    return this.vibesService.getActiveMoods();
  }

  @Sse("stream")
  stream(): Observable<MessageEvent> {
    return this.events$.asObservable();
  }

  @Patch("mood")
  @UseGuards(CsrfGuard)
  @HttpCode(204)
  async setMood(
    @CurrentUser() authUser: AuthUser,
    @Body("mood") mood: string | null,
  ): Promise<void> {
    await this.vibesService.setMood({ id: authUser.sub, role: authUser.role } as User, mood ?? null);
    this.events$.next({
      data: JSON.stringify({ type: "mood:updated", userId: authUser.sub, mood: mood ?? null }),
    });
  }

  @Post("reaction")
  @UseGuards(CsrfGuard)
  @HttpCode(204)
  async sendReaction(
    @CurrentUser() authUser: AuthUser,
    @Body("emoji") emoji: string,
  ): Promise<void> {
    this.events$.next({
      data: JSON.stringify({ type: "reaction", emoji, fromDisplayName: authUser.displayName }),
    });
  }

  @Post("bubble")
  @UseGuards(CsrfGuard)
  @HttpCode(204)
  async sendBubble(
    @CurrentUser() authUser: AuthUser,
    @Body("text") text: string,
  ): Promise<void> {
    this.vibesService.validateBubble(text);
    // Rate limit disabled for testing
    // this.vibesService.checkBubbleRateLimit(authUser.sub);
    this.events$.next({
      data: JSON.stringify({ type: "bubble", text }),
    });
  }

  @Patch("palette")
  @UseGuards(CsrfGuard)
  @HttpCode(204)
  async savePalette(
    @CurrentUser() authUser: AuthUser,
    @Body("palette") palette: string[],
  ): Promise<void> {
    await this.vibesService.savePalette({ id: authUser.sub } as User, palette);
  }
}
