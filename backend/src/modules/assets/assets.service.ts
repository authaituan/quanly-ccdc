import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAssetDto } from './dto/create-asset.dto';

/**
 * Warranty/support expiry alert window, in days. Matches the "canh bao
 * truoc 30-60 ngay" requirement from the ITAM feature spec.
 */
export const EXPIRY_ALERT_WINDOW_DAYS = 60;

@Injectable()
export class AssetsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(params: { categoryId?: string; siteId?: string } = {}) {
    return this.prisma.itAsset.findMany({
      where: {
        categoryId: params.categoryId,
        siteId: params.siteId,
      },
      include: { category: true, site: true },
    });
  }

  async findOne(id: string) {
    const asset = await this.prisma.itAsset.findUnique({
      where: { id },
      include: {
        category: true,
        site: true,
        rackPlacement: { include: { rackCabinet: true } },
        assignments: { orderBy: { handoverDate: 'desc' }, take: 5 },
        maintenanceLogs: { orderBy: { performedAt: 'desc' }, take: 10 },
        softwareLicenses: true,
      },
    });
    if (!asset) throw new NotFoundException(`Asset ${id} not found`);
    return asset;
  }

  findByAssetTag(assetTag: string) {
    // Used by the mobile-web QR scan lookup flow.
    return this.prisma.itAsset.findUnique({
      where: { assetTag },
      include: { category: true, site: true, maintenanceLogs: true },
    });
  }

  create(dto: CreateAssetDto) {
    // `specs` is a free-form JSON column; Prisma's generated input type wants
    // its exact JsonValue union, not our loosely-typed DTO shape.
    const { specs, ...rest } = dto;
    return this.prisma.itAsset.create({
      data: {
        ...rest,
        specs: specs as Prisma.InputJsonValue | undefined,
      },
    });
  }

  /**
   * Assets whose hardware warranty or support/license contract expires
   * within EXPIRY_ALERT_WINDOW_DAYS. Backs the lifecycle dashboard.
   */
  findExpiringSoon() {
    const now = new Date();
    const windowEnd = new Date(now.getTime() + EXPIRY_ALERT_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    return this.prisma.itAsset.findMany({
      where: {
        OR: [
          { warrantyExpiresAt: { gte: now, lte: windowEnd } },
          { supportExpiresAt: { gte: now, lte: windowEnd } },
        ],
      },
      orderBy: { warrantyExpiresAt: 'asc' },
    });
  }
}
