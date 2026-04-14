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
      mockPrisma.dutySession.findFirst.mockResolvedValue({ id: "s1" });
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
      mockPrisma.dutySession.findFirst.mockResolvedValue({ id: "s1" });
      mockPrisma.dutySession.update.mockResolvedValue({ id: "s1", mood: null });
      await service.setMood(mockUser as never, null);
      expect(mockPrisma.dutySession.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { mood: null } }),
      );
    });

    it("throws ForbiddenException when no active session", async () => {
      mockPrisma.dutySession.findFirst.mockResolvedValue(null);
      await expect(service.setMood(mockUser as never, "🔥")).rejects.toThrow(ForbiddenException);
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
