import { BadRequestException, Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateMaintenanceLogDto } from './dto/create-maintenance-log.dto';

// MAINT-01, quyết định 2026-08-11: field `cost` chỉ hiển thị cho
// IT_ADMIN/ACCOUNTANT trên GET - role khác vẫn xem được toàn bộ log
// (không nhạy cảm như VPN), chỉ riêng `cost` bị ẩn.
const ROLES_ALLOWED_TO_SEE_COST: UserRole[] = [UserRole.IT_ADMIN, UserRole.ACCOUNTANT];

@Injectable()
export class MaintenanceService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllForAsset(assetId: string, requesterRole: UserRole) {
    await this.assertAssetExists(assetId);
    const logs = await this.prisma.maintenanceLog.findMany({
      where: { assetId },
      orderBy: { performedAt: 'desc' },
    });
    if (ROLES_ALLOWED_TO_SEE_COST.includes(requesterRole)) return logs;
    return logs.map(({ cost, ...rest }) => rest);
  }

  async create(assetId: string, dto: CreateMaintenanceLogDto) {
    await this.assertAssetExists(assetId);
    return this.prisma.maintenanceLog.create({
      data: {
        assetId,
        type: dto.type,
        description: dto.description,
        supportProvider: dto.supportProvider,
        cost: dto.cost,
        ticketRef: dto.ticketRef,
        performedAt: dto.performedAt ? new Date(dto.performedAt) : undefined,
      },
    });
  }

  private async assertAssetExists(assetId: string) {
    const exists = await this.prisma.itAsset.findUnique({ where: { id: assetId } });
    if (!exists) throw new BadRequestException(`assetId "${assetId}" không tồn tại`);
  }
}
