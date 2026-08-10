import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { SitesService } from './sites.service';

// AUTH-02: cả 2 route GET chỉ cần đăng nhập, không giới hạn role cụ thể
// (bảng phân quyền đã duyệt 2026-08-10).
@Controller('sites')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SitesController {
  constructor(private readonly sitesService: SitesService) {}

  @Get()
  findAll() {
    return this.sitesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    // Includes racks + placements, powering the interactive rack visualizer.
    return this.sitesService.findOne(id);
  }
}
