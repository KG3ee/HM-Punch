import { NotFoundException } from "@nestjs/common";
import { UsersService } from "./users.service";

describe("UsersService.deleteUser", () => {
  const buildTransactionClient = () => ({
    auditEvent: { updateMany: jest.fn().mockResolvedValue(undefined) },
    registrationRequest: {
      updateMany: jest.fn().mockResolvedValue(undefined),
    },
    shiftChangeRequest: {
      updateMany: jest.fn().mockResolvedValue(undefined),
      deleteMany: jest.fn().mockResolvedValue(undefined),
    },
    driverRequest: {
      updateMany: jest.fn().mockResolvedValue(undefined),
      deleteMany: jest.fn().mockResolvedValue(undefined),
    },
    monthlyReport: { updateMany: jest.fn().mockResolvedValue(undefined) },
    breakSession: {
      updateMany: jest.fn().mockResolvedValue(undefined),
      deleteMany: jest.fn().mockResolvedValue(undefined),
    },
    dutySession: {
      updateMany: jest.fn().mockResolvedValue(undefined),
      deleteMany: jest.fn().mockResolvedValue(undefined),
    },
    violationPointEntry: {
      updateMany: jest.fn().mockResolvedValue(undefined),
      deleteMany: jest.fn().mockResolvedValue(undefined),
    },
    violationCase: {
      updateMany: jest.fn().mockResolvedValue(undefined),
      deleteMany: jest.fn().mockResolvedValue(undefined),
    },
    shiftAssignment: { deleteMany: jest.fn().mockResolvedValue(undefined) },
    shiftOverride: { deleteMany: jest.fn().mockResolvedValue(undefined) },
    user: { delete: jest.fn().mockResolvedValue(undefined) },
  });

  it("cleans shift and driver request references before deleting the user", async () => {
    const tx = buildTransactionClient();
    const prisma = {
      user: {
        count: jest.fn().mockResolvedValue(1),
      },
      $transaction: jest.fn(async (callback: (client: typeof tx) => Promise<void>) => callback(tx)),
    };

    const service = new UsersService(prisma as never);

    await service.deleteUser("user-1");

    expect(tx.shiftChangeRequest.updateMany).toHaveBeenCalledWith({
      where: { reviewedById: "user-1" },
      data: { reviewedById: null },
    });
    expect(tx.shiftChangeRequest.deleteMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
    });
    expect(tx.driverRequest.updateMany).toHaveBeenCalledWith({
      where: { driverId: "user-1" },
      data: { driverId: null },
    });
    expect(tx.driverRequest.updateMany).toHaveBeenCalledWith({
      where: { reviewedById: "user-1" },
      data: { reviewedById: null },
    });
    expect(tx.driverRequest.deleteMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
    });
    expect(tx.shiftOverride.deleteMany).toHaveBeenCalledWith({
      where: { targetType: "USER", targetId: "user-1" },
    });
    expect(tx.user.delete).toHaveBeenCalledWith({
      where: { id: "user-1" },
    });
  });

  it("throws NotFoundException when the user does not exist", async () => {
    const prisma = {
      user: {
        count: jest.fn().mockResolvedValue(0),
      },
      $transaction: jest.fn(),
    };

    const service = new UsersService(prisma as never);

    await expect(service.deleteUser("missing-user")).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
