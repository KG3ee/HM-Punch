import { Injectable } from '@nestjs/common';
import {
  NotificationPriority,
  NotificationType,
  Prisma,
  PushSubscription,
} from '@prisma/client';
import * as webpush from 'web-push';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { ListNotificationsDto } from './dto/list-notifications.dto';

type Cursor = {
  createdAt: Date;
  id: string;
};

type NotificationRow = {
  id: string;
  userId: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  body: string;
  link: string | null;
  createdAt: Date;
};

export type NotifyUsersInput = {
  type: NotificationType;
  priority?: NotificationPriority;
  title: string;
  body: string;
  link?: string;
  payloadJson?: Prisma.InputJsonValue | null;
};

@Injectable()
export class NotificationsService {
  private readonly pushEnabled: boolean;

  constructor(private readonly prisma: PrismaService) {
    const publicKey = process.env.WEB_PUSH_VAPID_PUBLIC_KEY?.trim();
    const privateKey = process.env.WEB_PUSH_VAPID_PRIVATE_KEY?.trim();
    const subject = process.env.WEB_PUSH_VAPID_SUBJECT?.trim();

    if (publicKey && privateKey && subject) {
      webpush.setVapidDetails(subject, publicKey, privateKey);
      this.pushEnabled = true;
    } else {
      this.pushEnabled = false;
    }
  }

  async saveSubscription(userId: string, dto: CreateSubscriptionDto) {
    return this.prisma.pushSubscription.upsert({
      where: { endpoint: dto.endpoint },
      create: {
        userId,
        endpoint: dto.endpoint,
        p256dh: dto.keys.p256dh,
        auth: dto.keys.auth,
        deviceLabel: dto.deviceLabel?.trim() || null,
        userAgent: dto.userAgent?.trim() || null,
        isActive: true,
        failureCount: 0,
        lastFailureAt: null,
        lastFailureReason: null,
      },
      update: {
        userId,
        p256dh: dto.keys.p256dh,
        auth: dto.keys.auth,
        deviceLabel: dto.deviceLabel?.trim() || null,
        userAgent: dto.userAgent?.trim() || null,
        isActive: true,
        failureCount: 0,
        lastFailureAt: null,
        lastFailureReason: null,
      },
      select: {
        id: true,
        endpoint: true,
        isActive: true,
        updatedAt: true,
      },
    });
  }

  async removeSubscription(userId: string, endpoint: string) {
    const result = await this.prisma.pushSubscription.updateMany({
      where: {
        userId,
        endpoint,
      },
      data: {
        isActive: false,
        lastFailureReason: 'UNSUBSCRIBED',
        lastFailureAt: new Date(),
      },
    });

    return {
      ok: true,
      deactivated: result.count,
    };
  }

  async listNotifications(userId: string, query: ListNotificationsDto) {
    const limit = this.parseLimit(query.limit);
    const unreadOnly = this.parseBoolean(query.unreadOnly);
    const cursor = this.parseCursor(query.cursor);

    const where: Prisma.UserNotificationWhereInput = {
      userId,
      ...(unreadOnly ? { isRead: false } : {}),
      ...(cursor
        ? {
            OR: [
              { createdAt: { lt: cursor.createdAt } },
              {
                createdAt: cursor.createdAt,
                id: { lt: cursor.id },
              },
            ],
          }
        : {}),
    };

    const rows = await this.prisma.userNotification.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      select: {
        id: true,
        type: true,
        priority: true,
        title: true,
        body: true,
        link: true,
        payloadJson: true,
        isRead: true,
        readAt: true,
        createdAt: true,
      },
    });

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore
      ? this.encodeCursor({
          createdAt: items[items.length - 1].createdAt,
          id: items[items.length - 1].id,
        })
      : null;

    return {
      items,
      nextCursor,
    };
  }

  async getUnreadCount(userId: string) {
    const unread = await this.prisma.userNotification.count({
      where: {
        userId,
        isRead: false,
      },
    });

    return { unread };
  }

  async markRead(userId: string, notificationId: string) {
    await this.prisma.userNotification.updateMany({
      where: {
        id: notificationId,
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return { ok: true };
  }

  async markReadAll(userId: string) {
    const result = await this.prisma.userNotification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return {
      ok: true,
      marked: result.count,
    };
  }

  async notifyUsers(userIds: string[], input: NotifyUsersInput) {
    const uniqueUserIds = [...new Set(userIds.filter(Boolean))];
    if (uniqueUserIds.length === 0) {
      return { created: 0, pushed: 0 };
    }

    const payloadJson =
      input.payloadJson === undefined || input.payloadJson === null
        ? undefined
        : input.payloadJson;

    const created = await this.prisma.$transaction(async (tx) => {
      const rows: NotificationRow[] = [];
      for (const userId of uniqueUserIds) {
        const row = await tx.userNotification.create({
          data: {
            userId,
            type: input.type,
            priority: input.priority || NotificationPriority.NORMAL,
            title: input.title,
            body: input.body,
            link: input.link || null,
            payloadJson,
          },
          select: {
            id: true,
            userId: true,
            type: true,
            priority: true,
            title: true,
            body: true,
            link: true,
            createdAt: true,
          },
        });
        rows.push(row);
      }
      return rows;
    });

    const pushed = await this.pushNotifications(created, payloadJson);
    return {
      created: created.length,
      pushed,
    };
  }

  private async pushNotifications(
    notifications: NotificationRow[],
    payloadJson?: Prisma.InputJsonValue | null,
  ): Promise<number> {
    if (!this.pushEnabled || notifications.length === 0) {
      return 0;
    }

    const subscriptions = await this.prisma.pushSubscription.findMany({
      where: {
        isActive: true,
        userId: { in: [...new Set(notifications.map((item) => item.userId))] },
      },
      select: {
        id: true,
        userId: true,
        endpoint: true,
        p256dh: true,
        auth: true,
      },
    });

    const byUser = new Map<string, Array<Pick<PushSubscription, 'id' | 'endpoint' | 'p256dh' | 'auth'>>>();
    for (const sub of subscriptions) {
      const existing = byUser.get(sub.userId) || [];
      existing.push(sub);
      byUser.set(sub.userId, existing);
    }

    let successCount = 0;
    for (const notification of notifications) {
      const userSubscriptions = byUser.get(notification.userId) || [];
      for (const sub of userSubscriptions) {
        const payload = JSON.stringify({
          id: notification.id,
          type: notification.type,
          priority: notification.priority,
          title: notification.title,
          body: notification.body,
          link: notification.link || '/',
          payload: payloadJson || null,
          createdAt: notification.createdAt.toISOString(),
        });

        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth,
              },
            },
            payload,
          );
          successCount += 1;
          await this.prisma.pushSubscription.update({
            where: { id: sub.id },
            data: {
              failureCount: 0,
              isActive: true,
              lastSuccessAt: new Date(),
              lastFailureAt: null,
              lastFailureReason: null,
            },
          });
        } catch (error) {
          await this.handlePushFailure(sub.id, error);
        }
      }
    }

    return successCount;
  }

  private async handlePushFailure(subscriptionId: string, error: unknown) {
    const statusCode = this.extractStatusCode(error);
    const reason = this.extractErrorReason(error);

    if (statusCode === 404 || statusCode === 410) {
      await this.prisma.pushSubscription.update({
        where: { id: subscriptionId },
        data: {
          isActive: false,
          failureCount: { increment: 1 },
          lastFailureAt: new Date(),
          lastFailureReason: reason,
        },
      });
      return;
    }

    await this.prisma.pushSubscription.update({
      where: { id: subscriptionId },
      data: {
        failureCount: { increment: 1 },
        lastFailureAt: new Date(),
        lastFailureReason: reason,
      },
    });
  }

  private extractStatusCode(error: unknown): number | null {
    if (!error || typeof error !== 'object') {
      return null;
    }
    const candidate = (error as { statusCode?: unknown }).statusCode;
    if (typeof candidate === 'number') {
      return candidate;
    }
    return null;
  }

  private extractErrorReason(error: unknown): string {
    if (error instanceof Error && error.message) {
      return error.message.slice(0, 500);
    }
    try {
      return JSON.stringify(error).slice(0, 500);
    } catch {
      return 'Unknown push error';
    }
  }

  private parseLimit(raw?: string): number {
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return 20;
    }
    return Math.min(100, Math.trunc(parsed));
  }

  private parseBoolean(raw?: string): boolean {
    if (!raw) return false;
    const normalized = raw.trim().toLowerCase();
    return normalized === '1' || normalized === 'true' || normalized === 'yes';
  }

  private encodeCursor(cursor: Cursor): string {
    return Buffer.from(`${cursor.createdAt.toISOString()}|${cursor.id}`, 'utf8').toString('base64url');
  }

  private parseCursor(raw?: string): Cursor | null {
    if (!raw) {
      return null;
    }

    try {
      const decoded = Buffer.from(raw, 'base64url').toString('utf8');
      const [dateIso, id] = decoded.split('|');
      if (!dateIso || !id) {
        return null;
      }
      const createdAt = new Date(dateIso);
      if (Number.isNaN(createdAt.getTime())) {
        return null;
      }
      return { createdAt, id };
    } catch {
      return null;
    }
  }
}
