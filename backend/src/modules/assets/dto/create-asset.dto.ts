import { IsString, IsOptional, IsEnum, IsDateString, IsNumber } from 'class-validator';
import { OperatingStatus, OwnershipStatus } from '@prisma/client';

export class CreateAssetDto {
  @IsString()
  assetTag: string;

  @IsString()
  name: string;

  @IsString()
  categoryId: string;

  @IsOptional()
  @IsString()
  siteId?: string;

  @IsOptional()
  @IsString()
  manufacturer?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsString()
  serialNumber?: string;

  @IsOptional()
  specs?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  ipAddress?: string;

  @IsOptional()
  @IsString()
  macAddress?: string;

  @IsOptional()
  @IsEnum(OperatingStatus)
  operatingStatus?: OperatingStatus;

  @IsOptional()
  @IsEnum(OwnershipStatus)
  ownershipStatus?: OwnershipStatus;

  @IsOptional()
  @IsDateString()
  warrantyExpiresAt?: string;

  @IsOptional()
  @IsDateString()
  supportExpiresAt?: string;

  @IsOptional()
  @IsNumber()
  purchaseCost?: number;
}
