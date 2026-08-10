import { IsOptional, IsString } from 'class-validator';

/**
 * ⚠️ Dữ liệu nhạy cảm — VPN/FortiClient username+password thật. Chỉ
 * IT_ADMIN mới gọi được route dùng DTO này (CRED-04, RolesGuard). Giá
 * trị password được mã hóa (AES-256-GCM, EncryptionService) trước khi
 * ghi vào DB - không bao giờ lưu plaintext. Không log DTO này ra
 * console/terminal dưới bất kỳ hình thức nào khi debug.
 */
export class UpsertCredentialsDto {
  @IsOptional()
  @IsString()
  vpnUsername?: string;

  @IsOptional()
  @IsString()
  vpnPassword?: string;

  @IsOptional()
  @IsString()
  fortiClientUsername?: string;

  @IsOptional()
  @IsString()
  fortiClientPassword?: string;
}
