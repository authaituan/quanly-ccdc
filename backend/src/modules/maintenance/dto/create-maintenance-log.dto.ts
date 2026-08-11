import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, MinLength } from 'class-validator';
import { MaintenanceType } from '@prisma/client';

export class CreateMaintenanceLogDto {
  @IsEnum(MaintenanceType)
  type: MaintenanceType;

  @IsString()
  @MinLength(1)
  description: string;

  @IsOptional()
  @IsString()
  supportProvider?: string;

  @IsOptional()
  @IsNumber()
  cost?: number;

  @IsOptional()
  @IsString()
  ticketRef?: string;

  @IsOptional()
  @IsDateString()
  performedAt?: string;
}
