import { PartialType } from '@nestjs/mapped-types';
import { CreateAssetDto } from './create-asset.dto';

/**
 * AST-04: cho phép sửa mọi field của CreateAssetDto, kể cả assetTag và
 * serialNumber (unique) - đã quyết định 2026-08-10. Service tự validate
 * unique trước khi update (xem AssetsService.update) thay vì để Prisma
 * throw lỗi P2002 khó đọc.
 */
export class UpdateAssetDto extends PartialType(CreateAssetDto) {}
