import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { OperatingStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';

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

  async create(dto: CreateAssetDto) {
    await this.assertCategoryExists(dto.categoryId);
    if (dto.siteId) await this.assertSiteExists(dto.siteId);
    await this.assertAssetTagAvailable(dto.assetTag);
    if (dto.serialNumber) await this.assertSerialNumberAvailable(dto.serialNumber);

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
   * AST-04. Cho sửa mọi field kể cả assetTag/serialNumber (unique) - đã
   * quyết định 2026-08-10. Validate FK + unique thủ công trước khi ghi,
   * để trả lỗi 400 rõ ràng thay vì để Prisma throw P2003/P2002 khó đọc.
   */
  async update(id: string, dto: UpdateAssetDto) {
    await this.findOne(id); // throws NotFoundException nếu id không tồn tại

    if (dto.categoryId) await this.assertCategoryExists(dto.categoryId);
    if (dto.siteId) await this.assertSiteExists(dto.siteId);
    if (dto.assetTag) await this.assertAssetTagAvailable(dto.assetTag, id);
    if (dto.serialNumber) await this.assertSerialNumberAvailable(dto.serialNumber, id);

    const { specs, ...rest } = dto;
    return this.prisma.itAsset.update({
      where: { id },
      data: {
        ...rest,
        specs: specs === undefined ? undefined : (specs as Prisma.InputJsonValue),
      },
    });
  }

  /**
   * AST-05. Soft delete - đã quyết định 2026-08-10: hệ thống quản lý tài
   * sản không được mất lịch sử thiết bị đã thanh lý (dữ liệu kiểm toán).
   * Không xóa dòng khỏi it_assets, chỉ chuyển operatingStatus sang
   * DECOMMISSIONED (giá trị có sẵn trong enum, xem schema.prisma).
   * KHÔNG có hàm remove()/hard-delete trong service này theo quyết định đó.
   */
  async decommission(id: string) {
    await this.findOne(id); // throws NotFoundException nếu id không tồn tại
    return this.prisma.itAsset.update({
      where: { id },
      data: { operatingStatus: OperatingStatus.DECOMMISSIONED },
    });
  }

  private async assertCategoryExists(categoryId: string) {
    const exists = await this.prisma.assetCategory.findUnique({ where: { id: categoryId } });
    if (!exists) throw new BadRequestException(`categoryId "${categoryId}" không tồn tại`);
  }

  private async assertSiteExists(siteId: string) {
    const exists = await this.prisma.site.findUnique({ where: { id: siteId } });
    if (!exists) throw new BadRequestException(`siteId "${siteId}" không tồn tại`);
  }

  private async assertAssetTagAvailable(assetTag: string, excludeId?: string) {
    const existing = await this.prisma.itAsset.findUnique({ where: { assetTag } });
    if (existing && existing.id !== excludeId) {
      throw new ConflictException(`assetTag "${assetTag}" đã tồn tại (asset id: ${existing.id})`);
    }
  }

  private async assertSerialNumberAvailable(serialNumber: string, excludeId?: string) {
    const existing = await this.prisma.itAsset.findUnique({ where: { serialNumber } });
    if (existing && existing.id !== excludeId) {
      throw new ConflictException(`serialNumber "${serialNumber}" đã tồn tại (asset id: ${existing.id})`);
    }
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
