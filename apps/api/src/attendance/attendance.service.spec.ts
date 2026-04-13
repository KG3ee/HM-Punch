import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException } from "@nestjs/common";
import { AttendanceService } from "./attendance.service";
import { PrismaService } from "../prisma/prisma.service";
import { ShiftsService } from "../shifts/shifts.service";
import { DeductionsService } from "../deductions/deductions.service";
import { ClientSyncService } from "../client-sync/client-sync.service";
import { DutySessionStatus } from "@prisma/client";

// Fixed "now" — Dubai 14:00 on 2026-04-13
const SERVER_NOW = new Date("2026-04-13T10:00:00.000Z");

// Minimal user fixture — fill in all required User fields from schema.prisma
const mockUser = {
  id: "user-1",
  teamId: "team-1",
  username: "alice",
  passwordHash: "hashed-password",
  mustChangePassword: false,
  firstName: "Alice",
  lastName: null,
  displayName: "Alice",
  contactNumber: null,
  profilePhotoUrl: null,
  role: "MEMBER",
  isActive: true,
  driverStatus: "OFFLINE",
  vehicleInfo: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Prisma transaction mock — calls the callback with mockTx
const mockTx = {
  dutySession: {
    create: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
  },
  breakSession: {
    update: jest.fn(),
    findMany: jest.fn(),
  },
};

const mockPrisma = {
  $transaction: jest.fn().mockImplementation(async (cb) => cb(mockTx)),
  dutySession: { findFirst: jest.fn() },
  shiftChangeRequest: { findFirst: jest.fn().mockResolvedValue(null) },
  team: { findUnique: jest.fn() },
  breakSession: { findMany: jest.fn().mockResolvedValue([]) },
  auditEvent: { create: jest.fn().mockResolvedValue({}) },
};

const mockShifts = { getSegmentForPunch: jest.fn() };
const mockDeductions = { recordPunchLateFromDutySession: jest.fn().mockResolvedValue({}) };
const mockClientSync = {
  findReceiptResponse: jest.fn().mockResolvedValue(null),
  saveDutySessionRef: jest.fn().mockResolvedValue({}),
  recordReceipt: jest.fn().mockResolvedValue({}),
};

function makeCreatedSession(overrides = {}) {
  return {
    id: "session-1",
    userId: "user-1",
    teamId: "team-1",
    shiftPresetId: null,
    shiftPresetSegmentId: null,
    shiftDate: "2026-04-13",
    localDate: "2026-04-13",
    punchedOnAt: SERVER_NOW,
    punchedOffAt: null,
    status: DutySessionStatus.ACTIVE,
    isLate: false,
    lateMinutes: 0,
    overtimeMinutes: 0,
    note: null,
    scheduledStartLocal: null,
    scheduledEndLocal: null,
    createdById: "user-1",
    createdAt: SERVER_NOW,
    updatedAt: SERVER_NOW,
    ...overrides,
  };
}

describe("AttendanceService.punchOn", () => {
  let service: AttendanceService;

  beforeEach(async () => {
    jest.useFakeTimers();
    jest.setSystemTime(SERVER_NOW);
    jest.clearAllMocks();

    mockClientSync.findReceiptResponse.mockResolvedValue(null);
    mockPrisma.dutySession.findFirst.mockResolvedValue(null);
    mockPrisma.shiftChangeRequest.findFirst.mockResolvedValue(null);
    mockPrisma.team.findUnique.mockResolvedValue(null);
    mockShifts.getSegmentForPunch.mockResolvedValue(null);
    mockDeductions.recordPunchLateFromDutySession.mockResolvedValue({});

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttendanceService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ShiftsService, useValue: mockShifts },
        { provide: DeductionsService, useValue: mockDeductions },
        { provide: ClientSyncService, useValue: mockClientSync },
      ],
    }).compile();

    service = module.get<AttendanceService>(AttendanceService);
  });

  afterEach(() => jest.useRealTimers());

  it("returns cached receipt immediately if one exists (idempotency)", async () => {
    const cached = { id: "session-1", syncStatus: "IDEMPOTENT" };
    mockClientSync.findReceiptResponse.mockResolvedValue(cached);

    const result = await service.punchOn(mockUser as never, {});
    expect(result).toBe(cached);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it("throws BadRequestException when session is already ACTIVE", async () => {
    mockPrisma.dutySession.findFirst.mockResolvedValue({ id: "existing", status: "ACTIVE" });

    await expect(service.punchOn(mockUser as never, {})).rejects.toThrow(BadRequestException);
  });

  it("creates a new DutySession with isLate=false when no shift is configured", async () => {
    const created = makeCreatedSession();
    mockTx.dutySession.create.mockResolvedValue(created);

    const result = await service.punchOn(mockUser as never, {
      clientTimestamp: SERVER_NOW.toISOString(),
    }) as ReturnType<typeof makeCreatedSession>;

    expect(mockTx.dutySession.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: "user-1", isLate: false, lateMinutes: 0 }),
      }),
    );
    expect(result.isLate).toBe(false);
  });

  it("marks isLate=true with correct lateMinutes when punching late via team shift", async () => {
    process.env.APP_TIMEZONE = "Asia/Dubai";
    mockPrisma.team.findUnique.mockResolvedValue({ shiftStartTime: "09:00", shiftEndTime: "17:00" });
    mockTx.dutySession.create.mockResolvedValue(makeCreatedSession({ isLate: true, lateMinutes: 300 }));

    const result = await service.punchOn(mockUser as never, { clientTimestamp: SERVER_NOW.toISOString() }) as ReturnType<typeof makeCreatedSession>;

    expect(result.isLate).toBe(true);
    expect(result.lateMinutes).toBe(300);
    expect(mockDeductions.recordPunchLateFromDutySession).toHaveBeenCalled();
  });
});
