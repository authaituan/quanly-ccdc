import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { MaintenanceService } from './maintenance.service';
import { CreateMaintenanceLogDto } from './dto/create-maintenance-log.dto';

interface AuthedRequest {
  user: { userId: string; email: string; role: UserRole };
}

// MAINT-01, quyết định 2026-08-11: GET chỉ cần đăng nhập (mọi role, xem
// AUTH-02); field `cost` bị lọc riêng cho role không phải IT_ADMIN/
// ACCOUNTANT ở tầng service. POST chỉ IT_ADMIN (nhất quán AST-04).
@Controller('assets')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  @Get(':assetId/maintenance-logs')
  findAllForAsset(@Param('assetId') assetId: string, @Req() req: AuthedRequest) {
    return this.maintenanceService.findAllForAsset(assetId, req.user.role);
  }

  @Post(':assetId/maintenance-logs')
  @Roles(UserRole.IT_ADMIN)
  create(@Param('assetId') assetId: string, @Body() dto: CreateMaintenanceLogDto) {
    return this.maintenanceService.create(assetId, dto);
  }
}
