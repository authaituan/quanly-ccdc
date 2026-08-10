import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AssetsService } from './assets.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';

// AUTH-02, bảng phân quyền đã duyệt 2026-08-10:
// - Mọi route GET: chỉ cần đăng nhập (JwtAuthGuard), không giới hạn role
//   cụ thể - không có @Roles(...) trên các route GET bên dưới.
// - POST/PATCH: IT_ADMIN + WAREHOUSE_MANAGER
// - DELETE (soft delete/thanh lý): chỉ IT_ADMIN
@Controller('assets')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Get()
  findAll(@Query('categoryId') categoryId?: string, @Query('siteId') siteId?: string) {
    return this.assetsService.findAll({ categoryId, siteId });
  }

  @Get('expiring-soon')
  findExpiringSoon() {
    return this.assetsService.findExpiringSoon();
  }

  @Get('by-tag/:assetTag')
  findByAssetTag(@Param('assetTag') assetTag: string) {
    // Called by the mobile-web QR scanner after decoding the tag on the sticker.
    return this.assetsService.findByAssetTag(assetTag);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.assetsService.findOne(id);
  }

  @Post()
  @Roles(UserRole.IT_ADMIN, UserRole.WAREHOUSE_MANAGER)
  create(@Body() dto: CreateAssetDto) {
    return this.assetsService.create(dto);
  }

  // AST-04
  @Patch(':id')
  @Roles(UserRole.IT_ADMIN, UserRole.WAREHOUSE_MANAGER)
  update(@Param('id') id: string, @Body() dto: UpdateAssetDto) {
    return this.assetsService.update(id, dto);
  }

  // AST-05: soft delete - chuyển operatingStatus sang DECOMMISSIONED,
  // KHÔNG xóa dòng khỏi DB (quyết định 2026-08-10, xem assets.service.ts).
  @Delete(':id')
  @Roles(UserRole.IT_ADMIN)
  decommission(@Param('id') id: string) {
    return this.assetsService.decommission(id);
  }
}
