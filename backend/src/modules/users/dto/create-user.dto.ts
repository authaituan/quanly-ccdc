import { IsEmail, IsEnum, IsString, MinLength } from 'class-validator';
import { UserRole } from '@prisma/client';

export class CreateUserDto {
  @IsEmail()
  email: string;

  // Mật khẩu ban đầu do IT_ADMIN tự đặt (quyết định 2026-08-10) - không
  // tự sinh ngẫu nhiên, không có field mustChangePassword ở phase này.
  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @MinLength(1)
  fullName: string;

  @IsEnum(UserRole)
  role: UserRole;
}
