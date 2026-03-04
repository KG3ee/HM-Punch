import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DriverRequestCategory,
  DriverRequestStatus,
  DriverStatus,
  NotificationPriority,
  NotificationType,
  Prisma,
  Role,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateDriverRequestDto } from './dto/create-driver-request.dto';

type DriverRequestWithRelations = Prisma.DriverRequestGetPayload<{
  include: {
    user: { select: { id: true; displayName: true; username: true } };
    driver: { select: { id: true; displayName: true; username: true } };
    reviewedBy: { select: { id: true; displayName: true; username: true } };
  };
}>;

type DriverRequestCreateResponse = DriverRequestWithRelations & {
  queueState: 'DRIVERS_AVAILABLE' | 'NO_AVAILABLE_DRIVERS';
  availableDriversCount: number;
};

@Injectable()
export class DriverRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private getInclude() {
    return {
      user: {
        select: {
          id: true,
          displayName: true,
          username: true,
        },
      },
      driver: {
        select: {
          id: true,
          displayName: true,
          username: true,
        },
      },
      reviewedBy: {
        select: {
          id: true,
          displayName: true,
          username: true,
        },
      },
    };
  }

  async create(userId: string, dto: CreateDriverRequestDto): Promise<DriverRequestCreateResponse> {
    const requestedDate = new Date(dto.requestedDate);
    if (Number.isNaN(requestedDate.getTime())) {
      throw new BadRequestException('requestedDate is invalid');
    }

    if (!dto.requestedTime || typeof dto.requestedTime !== 'string') {
      throw new BadRequestException('requestedTime is required');
    }

    if (!dto.destination || typeof dto.destination !== 'string') {
      throw new BadRequestException('destination is required');
    }

    const category = dto.category ?? DriverRequestCategory.GENERAL;

    const availableDriversCount = await this.prisma.user.count({
      where: {
        role: Role.DRIVER,
        isActive: true,
        driverStatus: DriverStatus.AVAILABLE,
      },
    });

    const created = await this.prisma.driverRequest.create({
      data: {
        userId,
        category,
        requestedDate,
        requestedTime: dto.requestedTime,
        destination: dto.destination,
        purpose: dto.purpose ?? null,
        isRoundTrip: dto.isRoundTrip ?? false,
        returnDate: dto.returnDate ? new Date(dto.returnDate) : null,
        returnTime: dto.returnTime ?? null,
        returnLocation: dto.returnLocation ?? null,
        contactNumber: dto.contactNumber ?? null,
        status: DriverRequestStatus.PENDING,
      },
      include: this.getInclude(),
    });

    const queueState =
      availableDriversCount > 0 ? 'DRIVERS_AVAILABLE' : 'NO_AVAILABLE_DRIVERS';

    void this.notifyCreated(created, queueState, availableDriversCount).catch(() => undefined);

    return {
      ...created,
      queueState,
      availableDriversCount,
    };
  }

  async listMyRequests(userId: string): Promise<DriverRequestWithRelations[]> {
    return this.prisma.driverRequest.findMany({
      where: { userId },
      include: this.getInclude(),
      orderBy: { createdAt: 'desc' },
    });
  }

  async listAllRequests(): Promise<DriverRequestWithRelations[]> {
    return this.prisma.driverRequest.findMany({
      include: this.getInclude(),
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAdminSummary(): Promise<{ pending: number }> {
    const pending = await this.prisma.driverRequest.count({
      where: { status: DriverRequestStatus.PENDING },
    });
    return { pending };
  }

  async getMySummary(userId: string): Promise<{ pending: number }> {
    const pending = await this.prisma.driverRequest.count({
      where: {
        userId,
        status: DriverRequestStatus.PENDING,
      },
    });

    return { pending };
  }

  async listAvailableForDrivers(driverId: string): Promise<DriverRequestWithRelations[]> {
    return this.prisma.driverRequest.findMany({
      where: {
        status: DriverRequestStatus.APPROVED,
        driverId,
      },
      include: this.getInclude(),
      orderBy: { requestedDate: 'asc' },
    });
  }

  async listMyAssignments(driverId: string): Promise<DriverRequestWithRelations[]> {
    return this.prisma.driverRequest.findMany({
      where: { driverId },
      include: this.getInclude(),
      orderBy: { requestedDate: 'asc' },
    });
  }

  async approve(
    requestId: string,
    reviewerId: string,
    adminNote?: string,
    driverId?: string,
  ): Promise<DriverRequestWithRelations> {
    const existing = await this.prisma.driverRequest.findUnique({
      where: { id: requestId },
      select: { status: true },
    });
    if (!existing) {
      throw new NotFoundException('Driver request not found');
    }
    if (existing.status !== DriverRequestStatus.PENDING) {
      throw new BadRequestException('Only pending requests can be approved');
    }

    if (driverId) {
      const driver = await this.prisma.user.findUnique({
        where: { id: driverId },
        select: { role: true },
      });
      if (!driver || driver.role !== Role.DRIVER) {
        throw new BadRequestException('Selected user is not a driver');
      }
    }

    const updated = await this.prisma.driverRequest.update({
      where: { id: requestId },
      data: {
        status: DriverRequestStatus.APPROVED,
        reviewedById: reviewerId,
        reviewedAt: new Date(),
        adminNote: adminNote ?? null,
        driverId: driverId ?? null,
      },
      include: this.getInclude(),
    });

    void this.notifyApproved(updated).catch(() => undefined);
    return updated;
  }

  async reject(
    requestId: string,
    reviewerId: string,
    adminNote?: string,
  ): Promise<DriverRequestWithRelations> {
    const existing = await this.prisma.driverRequest.findUnique({
      where: { id: requestId },
      select: { status: true },
    });
    if (!existing) {
      throw new NotFoundException('Driver request not found');
    }
    if (existing.status !== DriverRequestStatus.PENDING) {
      throw new BadRequestException('Only pending requests can be rejected');
    }

    const updated = await this.prisma.driverRequest.update({
      where: { id: requestId },
      data: {
        status: DriverRequestStatus.REJECTED,
        reviewedById: reviewerId,
        reviewedAt: new Date(),
        adminNote: adminNote ?? null,
      },
      include: this.getInclude(),
    });

    void this.notifyRejected(updated).catch(() => undefined);
    return updated;
  }

  async accept(requestId: string, driverId: string): Promise<DriverRequestWithRelations> {
    const user = await this.prisma.user.findUnique({
      where: { id: driverId },
      select: { role: true },
    });
    if (user?.role !== Role.DRIVER) {
      throw new ForbiddenException('Only drivers can accept requests');
    }

    const existing = await this.prisma.driverRequest.findUnique({
      where: { id: requestId },
      select: { status: true, driverId: true },
    });
    if (!existing) {
      throw new NotFoundException('Driver request not found');
    }
    if (existing.status !== DriverRequestStatus.APPROVED) {
      throw new BadRequestException('Only approved requests can be accepted by a driver');
    }
    if (existing.driverId && existing.driverId !== driverId) {
      throw new BadRequestException('This trip is assigned to a different driver');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const request = await tx.driverRequest.update({
        where: { id: requestId },
        data: {
          status: DriverRequestStatus.IN_PROGRESS,
          driverId,
        },
        include: this.getInclude(),
      });

      await tx.user.update({
        where: { id: driverId },
        data: { driverStatus: DriverStatus.BUSY },
      });

      return request;
    });

    void this.notifyInProgress(updated).catch(() => undefined);
    return updated;
  }

  async complete(requestId: string, driverId: string): Promise<DriverRequestWithRelations> {
    const existing = await this.prisma.driverRequest.findUnique({
      where: { id: requestId },
      select: { status: true, driverId: true },
    });
    if (!existing) {
      throw new NotFoundException('Driver request not found');
    }
    if (existing.status !== DriverRequestStatus.IN_PROGRESS) {
      throw new BadRequestException('Only in-progress requests can be completed');
    }
    if (existing.driverId !== driverId) {
      throw new ForbiddenException('Only the assigned driver can complete this request');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const request = await tx.driverRequest.update({
        where: { id: requestId },
        data: { status: DriverRequestStatus.COMPLETED },
        include: this.getInclude(),
      });

      await tx.user.update({
        where: { id: driverId },
        data: { driverStatus: DriverStatus.AVAILABLE },
      });

      return request;
    });

    void this.notifyCompleted(updated).catch(() => undefined);
    return updated;
  }

  async setDriverStatus(userId: string, status: DriverStatus): Promise<{ driverStatus: DriverStatus }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (user?.role !== Role.DRIVER) {
      throw new ForbiddenException('Only drivers can update driver status');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { driverStatus: status },
      select: { driverStatus: true },
    });

    return updated;
  }

  private async notifyCreated(
    request: DriverRequestWithRelations,
    queueState: 'DRIVERS_AVAILABLE' | 'NO_AVAILABLE_DRIVERS',
    availableDriversCount: number,
  ) {
    const [adminIds, driverIds] = await Promise.all([
      this.findActiveUserIdsByRole(Role.ADMIN),
      this.findActiveUserIdsByRole(Role.DRIVER),
    ]);

    const isMealRequest = request.category === DriverRequestCategory.MEAL_PICKUP;
    const priority = isMealRequest
      ? queueState === 'NO_AVAILABLE_DRIVERS'
        ? NotificationPriority.URGENT
        : NotificationPriority.HIGH
      : NotificationPriority.NORMAL;

    const title = isMealRequest
      ? queueState === 'NO_AVAILABLE_DRIVERS'
        ? 'Meal pickup queued: no available driver'
        : 'Meal pickup request created'
      : 'Driver request created';

    const body = isMealRequest
      ? `${request.user.displayName} requested meal pickup at ${request.requestedTime}.`
      : `${request.user.displayName} requested a trip to ${request.destination}.`;

    const payload = {
      driverRequestId: request.id,
      status: request.status,
      category: request.category,
      queueState,
      availableDriversCount,
    };

    await Promise.all([
      this.notificationsService.notifyUsers(adminIds, {
        type: NotificationType.DRIVER_REQUEST_CREATED,
        priority,
        title,
        body,
        link: '/admin/requests?tab=driver',
        payloadJson: payload,
      }),
      this.notificationsService.notifyUsers(driverIds, {
        type: NotificationType.DRIVER_REQUEST_CREATED,
        priority,
        title,
        body,
        link: '/employee/driver',
        payloadJson: payload,
      }),
    ]);
  }

  private async notifyApproved(request: DriverRequestWithRelations) {
    const [adminIds, creatorId] = await Promise.all([
      this.findActiveUserIdsByRole(Role.ADMIN),
      Promise.resolve(request.user.id),
    ]);

    const payload = {
      driverRequestId: request.id,
      status: request.status,
      assignedDriverId: request.driver?.id || null,
    };

    await Promise.all([
      this.notificationsService.notifyUsers([creatorId], {
        type: NotificationType.DRIVER_REQUEST_APPROVED,
        priority: NotificationPriority.NORMAL,
        title: 'Driver request approved',
        body: `Your request to ${request.destination} was approved.`,
        link: '/employee/requests',
        payloadJson: payload,
      }),
      this.notificationsService.notifyUsers(adminIds, {
        type: NotificationType.DRIVER_REQUEST_APPROVED,
        priority: NotificationPriority.NORMAL,
        title: 'Driver request approved',
        body: `${request.user.displayName}'s request was approved.`,
        link: '/admin/requests?tab=driver',
        payloadJson: payload,
      }),
      request.driver
        ? this.notificationsService.notifyUsers([request.driver.id], {
            type: NotificationType.DRIVER_REQUEST_APPROVED,
            priority: NotificationPriority.NORMAL,
            title: 'Trip assigned to you',
            body: `${request.user.displayName} requested ${request.destination}.`,
            link: '/employee/driver',
            payloadJson: payload,
          })
        : Promise.resolve({ created: 0, pushed: 0 }),
    ]);
  }

  private async notifyRejected(request: DriverRequestWithRelations) {
    const adminIds = await this.findActiveUserIdsByRole(Role.ADMIN);
    const payload = {
      driverRequestId: request.id,
      status: request.status,
    };

    await Promise.all([
      this.notificationsService.notifyUsers([request.user.id], {
        type: NotificationType.DRIVER_REQUEST_REJECTED,
        priority: NotificationPriority.NORMAL,
        title: 'Driver request rejected',
        body: `Your request to ${request.destination} was rejected.`,
        link: '/employee/requests',
        payloadJson: payload,
      }),
      this.notificationsService.notifyUsers(adminIds, {
        type: NotificationType.DRIVER_REQUEST_REJECTED,
        priority: NotificationPriority.NORMAL,
        title: 'Driver request rejected',
        body: `${request.user.displayName}'s request was rejected.`,
        link: '/admin/requests?tab=driver',
        payloadJson: payload,
      }),
    ]);
  }

  private async notifyInProgress(request: DriverRequestWithRelations) {
    const adminIds = await this.findActiveUserIdsByRole(Role.ADMIN);
    const payload = {
      driverRequestId: request.id,
      status: request.status,
      driverId: request.driver?.id || null,
    };

    await Promise.all([
      this.notificationsService.notifyUsers([request.user.id], {
        type: NotificationType.DRIVER_REQUEST_IN_PROGRESS,
        priority: NotificationPriority.NORMAL,
        title: 'Driver is on the way',
        body: `Your request to ${request.destination} is now in progress.`,
        link: '/employee/requests',
        payloadJson: payload,
      }),
      this.notificationsService.notifyUsers(adminIds, {
        type: NotificationType.DRIVER_REQUEST_IN_PROGRESS,
        priority: NotificationPriority.NORMAL,
        title: 'Driver request in progress',
        body: `${request.user.displayName}'s trip is now in progress.`,
        link: '/admin/requests?tab=driver',
        payloadJson: payload,
      }),
    ]);
  }

  private async notifyCompleted(request: DriverRequestWithRelations) {
    const adminIds = await this.findActiveUserIdsByRole(Role.ADMIN);
    const payload = {
      driverRequestId: request.id,
      status: request.status,
      driverId: request.driver?.id || null,
    };

    await Promise.all([
      this.notificationsService.notifyUsers([request.user.id], {
        type: NotificationType.DRIVER_REQUEST_COMPLETED,
        priority: NotificationPriority.NORMAL,
        title: 'Driver request completed',
        body: `Your request to ${request.destination} is completed.`,
        link: '/employee/requests',
        payloadJson: payload,
      }),
      this.notificationsService.notifyUsers(adminIds, {
        type: NotificationType.DRIVER_REQUEST_COMPLETED,
        priority: NotificationPriority.NORMAL,
        title: 'Driver request completed',
        body: `${request.user.displayName}'s trip was completed.`,
        link: '/admin/requests?tab=driver',
        payloadJson: payload,
      }),
    ]);
  }

  private async findActiveUserIdsByRole(role: Role): Promise<string[]> {
    const rows = await this.prisma.user.findMany({
      where: {
        role,
        isActive: true,
      },
      select: { id: true },
    });
    return rows.map((row) => row.id);
  }
}
