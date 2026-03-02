import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DutySessionStatus,
  Prisma,
  Role,
  ViolationLedgerReason,
  ViolationLedgerType,
  ViolationReason,
  ViolationSource,
  ViolationStatus,
} from '@prisma/client';
import { formatDateInZone } from '../core';
import { PrismaService } from '../prisma/prisma.service';
import { CreateObservedViolationDto } from './dto/create-observed-violation.dto';
import { CreateViolationReportDto } from './dto/create-violation-report.dto';
import {
  FinalizeViolationDecision,
  FinalizeViolationDto,
} from './dto/finalize-violation.dto';
import { ListViolationPointsDto } from './dto/list-violation-points.dto';
import { ListViolationsDto } from './dto/list-violations.dto';
import {
  LeaderTriageDecision,
  TriageViolationDto,
} from './dto/triage-violation.dto';

@Injectable()
export class ViolationsService {
  constructor(private readonly prisma: PrismaService) {}

  async createMemberReport(reporterUserId: string, dto: CreateViolationReportDto) {
    const reporter = await this.prisma.user.findUnique({
      where: { id: reporterUserId },
      select: { id: true, role: true },
    });
    if (!reporter) throw new NotFoundException('Reporter user not found');
    if (reporter.role === Role.ADMIN) {
      throw new ForbiddenException('Admin cannot submit member violation reports');
    }

    if (dto.accusedUserId === reporterUserId) {
      throw new BadRequestException('You cannot report yourself');
    }

    const occurredAt = this.parseOccurredAt(dto.occurredAt);
    await this.ensureUserOnDutyAt(dto.accusedUserId, occurredAt);

    const created = await this.prisma.violationCase.create({
      data: {
        source: ViolationSource.MEMBER_REPORT,
        status: ViolationStatus.PENDING,
        reason: dto.reason,
        accusedUserId: dto.accusedUserId,
        createdByUserId: reporterUserId,
        occurredAt,
        localDate: this.localDate(occurredAt),
        note: dto.note?.trim() || null,
      },
      select: {
        id: true,
        source: true,
        status: true,
        reason: true,
        occurredAt: true,
        localDate: true,
        note: true,
        createdAt: true,
        accusedUser: {
          select: {
            id: true,
            displayName: true,
            team: { select: { id: true, name: true } },
          },
        },
      },
    });

    await this.createAuditEvent(reporterUserId, 'VIOLATION_REPORT_CREATED', created.id, {
      source: created.source,
      reason: created.reason,
      accusedUserId: dto.accusedUserId,
      occurredAt: occurredAt.toISOString(),
      localDate: created.localDate,
    });

    return created;
  }

  async listMyReports(reporterUserId: string) {
    const rows = await this.prisma.violationCase.findMany({
      where: { createdByUserId: reporterUserId },
      select: {
        id: true,
        source: true,
        status: true,
        reason: true,
        occurredAt: true,
        localDate: true,
        note: true,
        leaderReviewedAt: true,
        leaderReviewNote: true,
        adminReviewedAt: true,
        adminReviewNote: true,
        createdAt: true,
        accusedUser: {
          select: {
            id: true,
            displayName: true,
            team: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }],
      take: 200,
    });

    return rows;
  }

  async listLeaderCases(leaderUserId: string, query: ListViolationsDto) {
    const teamId = await this.resolveLeaderTeamId(leaderUserId);
    const rows = await this.prisma.violationCase.findMany({
      where: {
        accusedUser: { teamId },
        ...(query.status ? { status: query.status } : {}),
        ...(query.source ? { source: query.source } : {}),
        ...(query.accusedUserId ? { accusedUserId: query.accusedUserId } : {}),
        ...(query.from || query.to
          ? {
              localDate: {
                ...(query.from ? { gte: query.from } : {}),
                ...(query.to ? { lte: query.to } : {}),
              },
            }
          : {}),
      },
      select: {
        id: true,
        source: true,
        status: true,
        reason: true,
        occurredAt: true,
        localDate: true,
        note: true,
        createdAt: true,
        leaderReviewedAt: true,
        leaderReviewNote: true,
        adminReviewedAt: true,
        adminReviewNote: true,
        accusedUser: {
          select: {
            id: true,
            displayName: true,
            username: true,
            team: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }],
      take: this.parseTake(query.limit),
      skip: this.parseSkip(query.offset),
    });

    return rows.map((row) => ({
      ...row,
      reporterLabel: row.source === ViolationSource.MEMBER_REPORT ? 'Anonymous' : null,
    }));
  }

  async triageLeaderCase(
    leaderUserId: string,
    caseId: string,
    dto: TriageViolationDto,
  ) {
    const teamId = await this.resolveLeaderTeamId(leaderUserId);
    const existing = await this.prisma.violationCase.findUnique({
      where: { id: caseId },
      select: {
        id: true,
        status: true,
        accusedUser: { select: { teamId: true } },
      },
    });
    if (!existing) throw new NotFoundException('Violation case not found');
    if (existing.accusedUser.teamId !== teamId) {
      throw new ForbiddenException('Violation case is outside your team');
    }
    if (existing.status === ViolationStatus.CONFIRMED || existing.status === ViolationStatus.REJECTED) {
      throw new BadRequestException('Violation case already finalized');
    }

    const nextStatus =
      dto.decision === LeaderTriageDecision.LEADER_VALID
        ? ViolationStatus.LEADER_VALID
        : ViolationStatus.LEADER_INVALID;

    const updated = await this.prisma.violationCase.update({
      where: { id: caseId },
      data: {
        status: nextStatus,
        leaderReviewedById: leaderUserId,
        leaderReviewedAt: new Date(),
        leaderReviewNote: dto.note?.trim() || null,
      },
      select: {
        id: true,
        status: true,
        leaderReviewedById: true,
        leaderReviewedAt: true,
        leaderReviewNote: true,
      },
    });

    await this.createAuditEvent(leaderUserId, 'VIOLATION_LEADER_TRIAGE', caseId, {
      decision: dto.decision,
      status: updated.status,
      note: updated.leaderReviewNote,
    });

    return updated;
  }

  async createLeaderObserved(leaderUserId: string, dto: CreateObservedViolationDto) {
    const teamId = await this.resolveLeaderTeamId(leaderUserId);
    const accused = await this.prisma.user.findUnique({
      where: { id: dto.accusedUserId },
      select: { id: true, teamId: true },
    });
    if (!accused) throw new NotFoundException('Accused user not found');
    if (accused.teamId !== teamId) {
      throw new ForbiddenException('Leader can only report observed incidents for own team');
    }

    const occurredAt = this.parseOccurredAt(dto.occurredAt);
    await this.ensureUserOnDutyAt(dto.accusedUserId, occurredAt);

    const created = await this.prisma.violationCase.create({
      data: {
        source: ViolationSource.LEADER_OBSERVED,
        status: ViolationStatus.PENDING,
        reason: dto.reason,
        accusedUserId: dto.accusedUserId,
        createdByUserId: leaderUserId,
        occurredAt,
        localDate: this.localDate(occurredAt),
        note: dto.note?.trim() || null,
      },
    });

    await this.createAuditEvent(leaderUserId, 'VIOLATION_LEADER_OBSERVED_CREATED', created.id, {
      reason: created.reason,
      accusedUserId: created.accusedUserId,
      occurredAt: created.occurredAt.toISOString(),
      localDate: created.localDate,
    });

    return created;
  }

  async listAdminCases(query: ListViolationsDto) {
    return this.prisma.violationCase.findMany({
      where: {
        ...(query.status ? { status: query.status } : {}),
        ...(query.source ? { source: query.source } : {}),
        ...(query.accusedUserId ? { accusedUserId: query.accusedUserId } : {}),
        ...(query.from || query.to
          ? {
              localDate: {
                ...(query.from ? { gte: query.from } : {}),
                ...(query.to ? { lte: query.to } : {}),
              },
            }
          : {}),
      },
      select: {
        id: true,
        source: true,
        status: true,
        reason: true,
        occurredAt: true,
        localDate: true,
        note: true,
        createdAt: true,
        updatedAt: true,
        leaderReviewedAt: true,
        leaderReviewNote: true,
        adminReviewedAt: true,
        adminReviewNote: true,
        accusedUser: {
          select: {
            id: true,
            username: true,
            displayName: true,
            role: true,
            team: { select: { id: true, name: true } },
          },
        },
        createdByUser: {
          select: {
            id: true,
            username: true,
            displayName: true,
            role: true,
            team: { select: { id: true, name: true } },
          },
        },
        leaderReviewedBy: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
        adminReviewedBy: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
        pointEntries: {
          select: {
            id: true,
            type: true,
            reason: true,
            points: true,
            localDate: true,
            note: true,
            createdAt: true,
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                role: true,
                team: { select: { id: true, name: true } },
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: [{ createdAt: 'desc' }],
      take: this.parseTake(query.limit),
      skip: this.parseSkip(query.offset),
    });
  }

  async createAdminObserved(adminUserId: string, dto: CreateObservedViolationDto) {
    const occurredAt = this.parseOccurredAt(dto.occurredAt);
    await this.ensureUserOnDutyAt(dto.accusedUserId, occurredAt);

    const created = await this.prisma.violationCase.create({
      data: {
        source: ViolationSource.ADMIN_OBSERVED,
        status: ViolationStatus.PENDING,
        reason: dto.reason,
        accusedUserId: dto.accusedUserId,
        createdByUserId: adminUserId,
        occurredAt,
        localDate: this.localDate(occurredAt),
        note: dto.note?.trim() || null,
      },
    });

    await this.createAuditEvent(adminUserId, 'VIOLATION_ADMIN_OBSERVED_CREATED', created.id, {
      reason: created.reason,
      accusedUserId: created.accusedUserId,
      occurredAt: created.occurredAt.toISOString(),
      localDate: created.localDate,
    });

    return created;
  }

  async finalizeCase(adminUserId: string, caseId: string, dto: FinalizeViolationDto) {
    const existing = await this.prisma.violationCase.findUnique({
      where: { id: caseId },
      select: {
        id: true,
        status: true,
        source: true,
        accusedUserId: true,
        createdByUserId: true,
        occurredAt: true,
        localDate: true,
      },
    });

    if (!existing) throw new NotFoundException('Violation case not found');
    if (existing.status === ViolationStatus.CONFIRMED || existing.status === ViolationStatus.REJECTED) {
      throw new BadRequestException('Violation case already finalized');
    }

    if (dto.decision === FinalizeViolationDecision.REJECTED) {
      const rejected = await this.prisma.violationCase.update({
        where: { id: caseId },
        data: {
          status: ViolationStatus.REJECTED,
          adminReviewedById: adminUserId,
          adminReviewedAt: new Date(),
          adminReviewNote: dto.note?.trim() || null,
        },
      });

      await this.createAuditEvent(adminUserId, 'VIOLATION_ADMIN_FINALIZED', caseId, {
        decision: dto.decision,
        status: rejected.status,
      });

      return rejected;
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedCase = await tx.violationCase.update({
        where: { id: caseId },
        data: {
          status: ViolationStatus.CONFIRMED,
          adminReviewedById: adminUserId,
          adminReviewedAt: new Date(),
          adminReviewNote: dto.note?.trim() || null,
        },
      });

      const pointRows: Prisma.ViolationPointEntryCreateManyInput[] = [];

      if (existing.source === ViolationSource.MEMBER_REPORT) {
        if ((dto.accusedDeductionPoints || 0) > 0) {
          pointRows.push({
            violationCaseId: caseId,
            userId: existing.accusedUserId,
            type: ViolationLedgerType.DEDUCTION,
            reason: ViolationLedgerReason.ACCUSED_DEDUCTION,
            points: dto.accusedDeductionPoints || 0,
            localDate: existing.localDate,
            note: dto.note?.trim() || null,
            createdByUserId: adminUserId,
          });
        }

        if ((dto.reporterRewardPoints || 0) > 0) {
          pointRows.push({
            violationCaseId: caseId,
            userId: existing.createdByUserId,
            type: ViolationLedgerType.REWARD,
            reason: ViolationLedgerReason.REPORT_REWARD,
            points: dto.reporterRewardPoints || 0,
            localDate: existing.localDate,
            note: dto.note?.trim() || null,
            createdByUserId: adminUserId,
          });
        }
      } else {
        const collectivePoints = dto.collectiveDeductionPoints || 0;
        if (collectivePoints <= 0) {
          throw new BadRequestException('collectiveDeductionPoints must be > 0 for observed incidents');
        }

        const onDutyUsers = await tx.dutySession.findMany({
          where: {
            punchedOnAt: { lte: existing.occurredAt },
            status: { not: DutySessionStatus.CANCELLED },
            OR: [
              { punchedOffAt: null },
              { punchedOffAt: { gte: existing.occurredAt } },
            ],
          },
          select: { userId: true },
          distinct: ['userId'],
        });

        if (onDutyUsers.length === 0) {
          throw new BadRequestException('No on-duty users found at incident time');
        }

        onDutyUsers.forEach((item) => {
          pointRows.push({
            violationCaseId: caseId,
            userId: item.userId,
            type: ViolationLedgerType.DEDUCTION,
            reason: ViolationLedgerReason.COLLECTIVE_DEDUCTION,
            points: collectivePoints,
            localDate: existing.localDate,
            note: dto.note?.trim() || null,
            createdByUserId: adminUserId,
          });
        });
      }

      if (pointRows.length > 0) {
        await tx.violationPointEntry.createMany({ data: pointRows });
      }

      const pointEntries = await tx.violationPointEntry.findMany({
        where: { violationCaseId: caseId },
        select: {
          id: true,
          userId: true,
          type: true,
          reason: true,
          points: true,
          localDate: true,
          note: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
      });

      return {
        violationCase: updatedCase,
        pointEntries,
      };
    });

    await this.createAuditEvent(adminUserId, 'VIOLATION_ADMIN_FINALIZED', caseId, {
      decision: dto.decision,
      source: existing.source,
      createdPointEntries: result.pointEntries.length,
      totalPoints: result.pointEntries.reduce((sum, row) => sum + row.points, 0),
    });

    return result;
  }

  async listPoints(query: ListViolationPointsDto) {
    return this.prisma.violationPointEntry.findMany({
      where: {
        ...(query.userId ? { userId: query.userId } : {}),
        ...(query.type ? { type: query.type } : {}),
        ...(query.reason ? { reason: query.reason } : {}),
        ...(query.from || query.to
          ? {
              localDate: {
                ...(query.from ? { gte: query.from } : {}),
                ...(query.to ? { lte: query.to } : {}),
              },
            }
          : {}),
      },
      select: {
        id: true,
        type: true,
        reason: true,
        points: true,
        localDate: true,
        note: true,
        createdAt: true,
        violationCaseId: true,
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            role: true,
            team: { select: { id: true, name: true } },
          },
        },
        createdByUser: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }],
      take: this.parseTake(query.limit),
      skip: this.parseSkip(query.offset),
    });
  }

  async exportPointsCsv(query: ListViolationPointsDto) {
    const rows = await this.listPoints({ ...query, limit: '5000', offset: '0' });

    const header = [
      'Entry ID',
      'Local Date',
      'Type',
      'Reason',
      'Points',
      'User',
      'Username',
      'Team',
      'Case ID',
      'Created By',
      'Created At',
      'Note',
    ];

    const csvRows = rows.map((row) => [
      row.id,
      row.localDate,
      row.type,
      row.reason,
      String(row.points),
      row.user.displayName,
      row.user.username,
      row.user.team?.name || '',
      row.violationCaseId,
      row.createdByUser?.displayName || '',
      row.createdAt.toISOString(),
      row.note || '',
    ]);

    const csv = [header, ...csvRows]
      .map((columns) => columns.map((column) => this.escapeCsv(column)).join(','))
      .join('\n');

    const suffix = query.from || query.to ? `${query.from || 'start'}_${query.to || 'end'}` : 'all';

    return {
      filename: `violation-points-${suffix}.csv`,
      csv,
      count: rows.length,
    };
  }

  private async resolveLeaderTeamId(leaderUserId: string): Promise<string> {
    const leader = await this.prisma.user.findUnique({
      where: { id: leaderUserId },
      select: { role: true, teamId: true },
    });
    if (!leader) throw new NotFoundException('Leader not found');
    if (leader.role !== Role.LEADER) {
      throw new ForbiddenException('Only leaders can perform this action');
    }
    if (!leader.teamId) {
      throw new BadRequestException('Leader is not assigned to any team');
    }
    return leader.teamId;
  }

  private async ensureUserOnDutyAt(userId: string, at: Date) {
    const session = await this.prisma.dutySession.findFirst({
      where: {
        userId,
        punchedOnAt: { lte: at },
        status: { not: DutySessionStatus.CANCELLED },
        OR: [
          { punchedOffAt: null },
          { punchedOffAt: { gte: at } },
        ],
      },
      select: {
        id: true,
      },
      orderBy: { punchedOnAt: 'desc' },
    });

    if (!session) {
      throw new BadRequestException('Accused user must be on duty at the incident time');
    }

    return session;
  }

  private parseOccurredAt(raw?: string): Date {
    if (!raw) return new Date();
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException('Invalid occurredAt timestamp');
    }
    return parsed;
  }

  private localDate(value: Date): string {
    return formatDateInZone(value, process.env.APP_TIMEZONE || 'Asia/Dubai');
  }

  private parseTake(limit?: string): number {
    if (!limit) return 200;
    const parsed = Number(limit);
    if (!Number.isFinite(parsed) || parsed <= 0) return 200;
    return Math.min(500, Math.trunc(parsed));
  }

  private parseSkip(offset?: string): number {
    if (!offset) return 0;
    const parsed = Number(offset);
    if (!Number.isFinite(parsed) || parsed < 0) return 0;
    return Math.trunc(parsed);
  }

  private async createAuditEvent(
    actorUserId: string,
    action: string,
    entityId: string,
    payload: Record<string, unknown>,
  ) {
    await this.prisma.auditEvent.create({
      data: {
        actorUserId,
        action,
        entityType: 'ViolationCase',
        entityId,
        payload: payload as Prisma.InputJsonValue,
      },
    }).catch(() => undefined);
  }

  private escapeCsv(value: unknown): string {
    const text = String(value ?? '');
    return `"${text.replace(/"/g, '""')}"`;
  }
}
