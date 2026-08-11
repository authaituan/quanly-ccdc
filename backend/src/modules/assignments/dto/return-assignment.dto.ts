import { IsDateString, IsOptional } from 'class-validator';

export class ReturnAssignmentDto {
  // Mặc định = thời điểm gọi API nếu không gửi lên.
  @IsOptional()
  @IsDateString()
  actualReturnDate?: string;
}
