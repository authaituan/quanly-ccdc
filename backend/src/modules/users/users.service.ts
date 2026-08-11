import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

// Đồng nhất với seed.ts (seedFirstAdmin) - đã audit 2026-08-10.
const BCRYPT_ROUNDS = 10;

// passwordHash KHÔNG BAO GIỜ được trả về qua API, dù đã hash - dùng
// select tường minh này cho mọi query trả về response (không có pattern
// @Exclude/ClassSerializerInterceptor sẵn có trong codebase, nên dùng
// cách loại field tường minh nhất quán với phong cách hiện tại).
const SAFE_USER_SELECT = {
  id: true,
  email: true,
  fullName: true,
  role: true,
  active: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.user.findMany({ select: SAFE_USER_SELECT, orderBy: { createdAt: 'asc' } });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: SAFE_USER_SELECT });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }

  async create(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException(`Email "${dto.email}" đã tồn tại (user id: ${existing.id})`);
    }
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    return this.prisma.user.create({
      data: { email: dto.email, passwordHash, fullName: dto.fullName, role: dto.role },
      select: SAFE_USER_SELECT,
    });
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.findOne(id); // throws NotFoundException nếu id không tồn tại
    return this.prisma.user.update({
      where: { id },
      data: dto,
      select: SAFE_USER_SELECT,
    });
  }

  /**
   * 2 nhánh (quyết định 2026-08-10):
   * - requesterId === targetId (tự đổi password): bắt buộc oldPassword
   *   đúng, verify bằng bcrypt.compare.
   * - requesterId !== targetId (admin reset hộ): chỉ IT_ADMIN mới gọi
   *   được (route đã chặn bằng RolesGuard), bỏ qua oldPassword hoàn
   *   toàn - không dùng oldPassword dù có gửi lên.
   */
  async changePassword(
    targetId: string,
    dto: ChangePasswordDto,
    requester: { userId: string; role: UserRole },
  ) {
    const target = await this.prisma.user.findUnique({ where: { id: targetId } });
    if (!target) throw new NotFoundException(`User ${targetId} not found`);

    const isSelf = requester.userId === targetId;
    if (!isSelf) {
      // Không phải tự đổi -> phải là IT_ADMIN mới được reset hộ. Route đã
      // có @Roles nhưng đây là hàng rào thứ hai ở tầng service (giống
      // pattern assertIsAdmin() ở CredentialsService).
      if (requester.role !== UserRole.IT_ADMIN) {
        throw new ForbiddenException('Chỉ IT_ADMIN mới được đổi mật khẩu của người dùng khác');
      }
    } else {
      if (!dto.oldPassword) {
        throw new BadRequestException('Phải nhập mật khẩu cũ để tự đổi mật khẩu');
      }
      const oldPasswordOk = await bcrypt.compare(dto.oldPassword, target.passwordHash);
      if (!oldPasswordOk) {
        throw new UnauthorizedException('Mật khẩu cũ không đúng');
      }
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);
    await this.prisma.user.update({ where: { id: targetId }, data: { passwordHash } });
    return { message: 'Đổi mật khẩu thành công' };
  }

  /**
   * Soft delete (nhất quán với AST-05) - chỉ đổi active=false, không xóa
   * dòng khỏi DB. Chặn tự vô hiệu hóa chính mình.
   */
  async deactivate(targetId: string, requester: { userId: string }) {
    if (requester.userId === targetId) {
      throw new ForbiddenException('Không thể tự vô hiệu hóa chính tài khoản đang đăng nhập');
    }
    await this.findOne(targetId); // throws NotFoundException nếu không tồn tại
    return this.prisma.user.update({
      where: { id: targetId },
      data: { active: false },
      select: SAFE_USER_SELECT,
    });
  }
}
