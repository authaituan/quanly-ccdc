import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { LicensesService } from './licenses.service';
import { CreateLicenseDto } from './dto/create-license.dto';

// LIC-01, quyết định 2026-08-11: GET chỉ cần đăng nhập (mọi role) - trả
// licenseKey plaintext (không mã hóa, không hạn chế riêng như VPN/CRED-04).
// POST chỉ IT_ADMIN (nhất quán AST-04).
@Controller('assets')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LicensesController {
  constructor(private readonly licensesService: LicensesService) {}

  @Get(':assetId/licenses')
  findAllForAsset(@Param('assetId') assetId: string) {
    return this.licensesService.findAllForAsset(assetId);
  }

  @Post(':assetId/licenses')
  @Roles(UserRole.IT_ADMIN)
  create(@Param('assetId') assetId: string, @Body() dto: CreateLicenseDto) {
    return this.licensesService.create(assetId, dto);
  }
}
