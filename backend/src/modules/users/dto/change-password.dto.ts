import { IsOptional, IsString, MinLength } from 'class-validator';

/**
 * 2 nhánh dùng chung DTO này (quyết định 2026-08-10):
 * - Chính chủ tự đổi password: PHẢI gửi `oldPassword` đúng, service verify
 *   bằng bcrypt.compare trước khi cho đổi.
 * - IT_ADMIN reset password cho user khác: KHÔNG gửi `oldPassword` (hoặc
 *   service bỏ qua nếu requester khác targetUser và là IT_ADMIN) - xem
 *   logic phân nhánh thật trong users.service.ts.
 */
export class ChangePasswordDto {
  @IsOptional()
  @IsString()
  oldPassword?: string;

  @IsString()
  @MinLength(8)
  newPassword: string;
}
