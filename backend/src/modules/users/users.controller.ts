import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

interface AuthedRequest {
  user: { userId: string; email: string; role: UserRole };
}

// USER-01, quyết định 2026-08-10: toàn bộ route module users chỉ
// IT_ADMIN, TRỪ PATCH /:id/password khi tự đổi password của chính mình
// (route đó không gắn @Roles ở method - JwtAuthGuard vẫn bắt buộc đăng
// nhập, còn việc "được đổi của ai" xử lý trong UsersService.changePassword).
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(UserRole.IT_ADMIN)
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @Roles(UserRole.IT_ADMIN)
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  @Roles(UserRole.IT_ADMIN)
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Patch(':id')
  @Roles(UserRole.IT_ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  // Không @Roles(...) - cho phép mọi user đã đăng nhập tự đổi password
  // của chính mình. Đổi hộ người khác vẫn bị chặn ở tầng service nếu
  // requester không phải IT_ADMIN (xem UsersService.changePassword).
  @Patch(':id/password')
  changePassword(@Param('id') id: string, @Body() dto: ChangePasswordDto, @Req() req: AuthedRequest) {
    return this.usersService.changePassword(id, dto, req.user);
  }

  // Soft delete (active=false), không xóa dòng - nhất quán AST-05.
  @Delete(':id')
  @Roles(UserRole.IT_ADMIN)
  deactivate(@Param('id') id: string, @Req() req: AuthedRequest) {
    return this.usersService.deactivate(id, req.user);
  }
}
