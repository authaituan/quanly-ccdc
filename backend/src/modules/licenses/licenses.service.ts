import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateLicenseDto } from './dto/create-license.dto';

@Injectable()
export class LicensesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllForAsset(assetId: string) {
    await this.assertAssetExists(assetId);
    return this.prisma.softwareLicenseLink.findMany({
      where: { assetId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(assetId: string, dto: CreateLicenseDto) {
    await this.assertAssetExists(assetId);
    return this.prisma.softwareLicenseLink.create({
      data: {
        assetId,
        softwareName: dto.softwareName,
        licenseKey: dto.licenseKey, // plaintext - quyết định 2026-08-11 (LIC-01)
        activatedAt: dto.activatedAt ? new Date(dto.activatedAt) : undefined,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      },
    });
  }

  private async assertAssetExists(assetId: string) {
    const exists = await this.prisma.itAsset.findUnique({ where: { id: assetId } });
    if (!exists) throw new BadRequestException(`assetId "${assetId}" không tồn tại`);
  }
}
