import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CredentialsService } from './credentials.service';
import { UpsertCredentialsDto } from './dto/upsert-credentials.dto';

interface AuthedRequest {
  user: { userId: string; email: string; role: UserRole };
}

// CRED-02/03/04, quyết định 2026-08-10: cả 2 route chỉ IT_ADMIN
// (route-level RolesGuard - đây là hàng rào thứ nhất; CredentialsService
// tự kiểm tra lại role ở tầng data-access như hàng rào thứ hai, xem
// credentials.service.ts).
@Controller('assets')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CredentialsController {
  constructor(private readonly credentialsService: CredentialsService) {}

  @Post(':assetId/credentials')
  @Roles(UserRole.IT_ADMIN)
  upsert(@Param('assetId') assetId: string, @Body() dto: UpsertCredentialsDto, @Req() req: AuthedRequest) {
    return this.credentialsService.upsert({ assetId, ...dto }, req.user.role);
  }

  @Get(':assetId/credentials')
  @Roles(UserRole.IT_ADMIN)
  reveal(@Param('assetId') assetId: string, @Req() req: AuthedRequest) {
    return this.credentialsService.reveal(assetId, req.user.role);
  }
}
