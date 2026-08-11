import { IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateAssignmentDto {
  @IsString()
  assetId: string;

  @IsOptional()
  @IsString()
  employeeId?: string;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsDateString()
  handoverDate: string;

  @IsOptional()
  @IsDateString()
  expectedReturnDate?: string;

  // Tinh_Trang_Kiem_Tra: kèm sạc, dây HDMI, chuột... (JSON tự do)
  @IsOptional()
  handoverChecklist?: Record<string, unknown>;
}
