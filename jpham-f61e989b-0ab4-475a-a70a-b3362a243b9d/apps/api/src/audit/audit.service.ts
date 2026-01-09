import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';
import { AuditAction, IAuditLog } from '@jpham-f61e989b-0ab4-475a-a70a-b3362a243b9d/data';

export interface CreateAuditLogDto {
  action: AuditAction;
  resource: string;
  resourceId?: string | null;
  userId?: string | null;
  organizationId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface AuditLogFilters {
  userId?: string;
  organizationId?: string;
  action?: AuditAction;
  resource?: string;
  startDate?: Date;
  endDate?: Date;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  async log(dto: CreateAuditLogDto): Promise<AuditLog> {
    const auditLog = this.auditLogRepository.create({
      action: dto.action,
      resource: dto.resource,
      resourceId: dto.resourceId ?? null,
      userId: dto.userId ?? null,
      organizationId: dto.organizationId ?? null,
      ipAddress: dto.ipAddress ?? null,
      userAgent: dto.userAgent ?? null,
      metadata: dto.metadata ?? null,
    });

    return this.auditLogRepository.save(auditLog);
  }

  async findByOrganization(
    organizationId: string,
    filters?: Omit<AuditLogFilters, 'organizationId'>,
    page = 1,
    limit = 50,
  ): Promise<{ data: IAuditLog[]; total: number }> {
    const where: Record<string, unknown> = { organizationId };

    if (filters?.userId) {
      where['userId'] = filters.userId;
    }
    if (filters?.action) {
      where['action'] = filters.action;
    }
    if (filters?.resource) {
      where['resource'] = filters.resource;
    }
    if (filters?.startDate && filters?.endDate) {
      where['createdAt'] = Between(filters.startDate, filters.endDate);
    } else if (filters?.startDate) {
      where['createdAt'] = MoreThanOrEqual(filters.startDate);
    } else if (filters?.endDate) {
      where['createdAt'] = LessThanOrEqual(filters.endDate);
    }

    const [data, total] = await this.auditLogRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: data.map((log) => this.toResponse(log)),
      total,
    };
  }

  async findByUser(
    userId: string,
    filters?: Omit<AuditLogFilters, 'userId'>,
    page = 1,
    limit = 50,
  ): Promise<{ data: IAuditLog[]; total: number }> {
    const where: Record<string, unknown> = { userId };

    if (filters?.organizationId) {
      where['organizationId'] = filters.organizationId;
    }
    if (filters?.action) {
      where['action'] = filters.action;
    }
    if (filters?.resource) {
      where['resource'] = filters.resource;
    }
    if (filters?.startDate && filters?.endDate) {
      where['createdAt'] = Between(filters.startDate, filters.endDate);
    } else if (filters?.startDate) {
      where['createdAt'] = MoreThanOrEqual(filters.startDate);
    } else if (filters?.endDate) {
      where['createdAt'] = LessThanOrEqual(filters.endDate);
    }

    const [data, total] = await this.auditLogRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: data.map((log) => this.toResponse(log)),
      total,
    };
  }

  private toResponse(log: AuditLog): IAuditLog {
    return {
      id: log.id,
      action: log.action,
      resource: log.resource,
      resourceId: log.resourceId,
      userId: log.userId,
      organizationId: log.organizationId,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      metadata: log.metadata,
      createdAt: log.createdAt,
    };
  }
}
