import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AssignmentStatus, UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AssignmentsService } from './assignments.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { ReturnAssignmentDto } from './dto/return-assignment.dto';

// ASSIGN-01, quyết định 2026-08-11: GET chỉ cần đăng nhập (như /assets);
// cấp phát/thu hồi (ghi) chỉ IT_ADMIN.
@Controller('assignments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Get()
  findAll(
    @Query('assetId') assetId?: string,
    @Query('employeeId') employeeId?: string,
    @Query('status') status?: AssignmentStatus,
  ) {
    return this.assignmentsService.findAll({ assetId, employeeId, status });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.assignmentsService.findOne(id);
  }

  @Post()
  @Roles(UserRole.IT_ADMIN)
  create(@Body() dto: CreateAssignmentDto) {
    return this.assignmentsService.create(dto);
  }

  @Patch(':id/return')
  @Roles(UserRole.IT_ADMIN)
  returnAssignment(@Param('id') id: string, @Body() dto: ReturnAssignmentDto) {
    return this.assignmentsService.returnAssignment(id, dto);
  }
}
