import { IsDateString, IsOptional, IsString, MinLength } from 'class-validator';

// LIC-01, quyết định 2026-08-11: licenseKey KHÔNG mã hóa (khác với
// NetworkAccessCredential/CRED-02 - license phần mềm không nhạy cảm bằng
// mật khẩu truy cập hạ tầng mạng), lưu plaintext trực tiếp.
export class CreateLicenseDto {
  @IsString()
  @MinLength(1)
  softwareName: string;

  @IsOptional()
  @IsString()
  licenseKey?: string;

  @IsOptional()
  @IsDateString()
  activatedAt?: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
