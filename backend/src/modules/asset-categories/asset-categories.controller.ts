import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { AssetCategoriesService } from './asset-categories.service';

// AC-01 (FE-04): chỉ 1 route GET, mọi role đã đăng nhập (cùng pattern
// SitesController) - không có @Roles(...), phục vụ dropdown category ở FE.
@Controller('asset-categories')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AssetCategoriesController {
  constructor(private readonly assetCategoriesService: AssetCategoriesService) {}

  @Get()
  findAll() {
    return this.assetCategoriesService.findAll();
  }
}
