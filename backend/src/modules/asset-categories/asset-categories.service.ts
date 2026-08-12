import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// AC-01 (FE-04): chỉ đọc, phục vụ dropdown "Loại máy" khi tạo/sửa asset ở
// frontend - trước đó không có route nào trả danh sách AssetCategory.
@Injectable()
export class AssetCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.assetCategory.findMany({ orderBy: { name: 'asc' } });
  }
}
