import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AssignmentStatus, ItAsset, OperatingStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { ReturnAssignmentDto } from './dto/return-assignment.dto';

// ASSIGN-01. Quyết định 2026-08-11, XÁC NHẬN LẠI VỚI NGƯỜI DÙNG THẬT,
// GHI ĐÈ quyết định tạm trước đó của Claude Code:
// - CHẶN nhiều assignment ACTIVE cùng lúc trên 1 asset (409 Conflict).
// - Chặn cấp phát asset đã DECOMMISSIONED hoặc đang MAINTENANCE/FAULTY
//   (400) - không giao thiết bị hỏng/đã thanh lý.
// - TỰ ĐỘNG đồng bộ ItAsset.operatingStatus:
//   * Cấp phát thành công -> PRODUCTION.
//   * Thu hồi -> chỉ tự đặt lại IN_STOCK nếu operatingStatus hiện tại
//     ĐÚNG LÀ PRODUCTION (nghĩa là chưa bị admin can thiệp tay từ lúc
//     cấp phát tới lúc thu hồi). Nếu admin đã tự đổi sang
//     MAINTENANCE/FAULTY/khác trong lúc đang cấp phát, TÔN TRỌNG giá trị
//     đó, không ghi đè - admin vẫn có toàn quyền sửa tay qua
//     PATCH /assets/:id bất kỳ lúc nào (field không bị khóa).
// - Dùng interactive transaction ($transaction(async (tx) => ...)) để cả
//   2 thao tác (assignment + asset) luôn cùng thành công hoặc cùng thất
//   bại, không bao giờ lệch nửa chừng.
@Injectable()
export class AssignmentsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(params: { assetId?: string; employeeId?: string; status?: AssignmentStatus } = {}) {
    return this.prisma.endUserAssignment.findMany({
      where: { assetId: params.assetId, employeeId: params.employeeId, status: params.status },
      include: { asset: true, employee: true, department: true },
      orderBy: { handoverDate: 'desc' },
    });
  }

  async findOne(id: string) {
    const assignment = await this.prisma.endUserAssignment.findUnique({
      where: { id },
      include: { asset: true, employee: true, department: true },
    });
    if (!assignment) throw new NotFoundException(`Assignment ${id} not found`);
    return assignment;
  }

  async create(dto: CreateAssignmentDto) {
    const asset = await this.assertAssetExists(dto.assetId);
    if (dto.employeeId) await this.assertEmployeeExists(dto.employeeId);
    if (dto.departmentId) await this.assertDepartmentExists(dto.departmentId);

    // 2b/2c: không cấp phát asset đã thanh lý hoặc đang hỏng/bảo trì.
    if (asset.operatingStatus === OperatingStatus.DECOMMISSIONED) {
      throw new BadRequestException(`Asset ${dto.assetId} đã thanh lý (DECOMMISSIONED), không thể cấp phát`);
    }
    if (asset.operatingStatus === OperatingStatus.MAINTENANCE || asset.operatingStatus === OperatingStatus.FAULTY) {
      throw new BadRequestException(
        `Asset ${dto.assetId} đang ở trạng thái "${asset.operatingStatus}", không thể cấp phát`,
      );
    }

    // 2a: chặn nhiều assignment ACTIVE cùng lúc trên 1 asset.
    const existingActive = await this.prisma.endUserAssignment.findFirst({
      where: { assetId: dto.assetId, status: AssignmentStatus.ACTIVE },
    });
    if (existingActive) {
      throw new ConflictException(
        `Asset ${dto.assetId} đang có assignment ACTIVE (id: ${existingActive.id}) - phải thu hồi (PATCH /assignments/${existingActive.id}/return) trước khi cấp phát mới`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const assignment = await tx.endUserAssignment.create({
        data: {
          assetId: dto.assetId,
          employeeId: dto.employeeId,
          departmentId: dto.departmentId,
          handoverDate: new Date(dto.handoverDate),
          expectedReturnDate: dto.expectedReturnDate ? new Date(dto.expectedReturnDate) : undefined,
          handoverChecklist: dto.handoverChecklist as Prisma.InputJsonValue | undefined,
        },
        include: { asset: true, employee: true, department: true },
      });
      await tx.itAsset.update({
        where: { id: dto.assetId },
        data: { operatingStatus: OperatingStatus.PRODUCTION },
      });
      return { ...assignment, asset: { ...assignment.asset, operatingStatus: OperatingStatus.PRODUCTION } };
    });
  }

  async returnAssignment(id: string, dto: ReturnAssignmentDto) {
    const assignment = await this.findOne(id);
    if (assignment.status !== AssignmentStatus.ACTIVE) {
      throw new BadRequestException(
        `Assignment ${id} đang ở trạng thái "${assignment.status}", không thể thu hồi (chỉ thu hồi được assignment đang ACTIVE)`,
      );
    }

    // 2d: chỉ tự đặt lại IN_STOCK nếu operatingStatus hiện tại đúng là
    // PRODUCTION (chưa bị admin can thiệp tay) - tôn trọng giá trị admin
    // đã tự set (MAINTENANCE/FAULTY/khác) nếu có.
    const shouldResetToInStock = assignment.asset.operatingStatus === OperatingStatus.PRODUCTION;

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.endUserAssignment.update({
        where: { id },
        data: {
          status: AssignmentStatus.RETURNED,
          actualReturnDate: dto.actualReturnDate ? new Date(dto.actualReturnDate) : new Date(),
        },
        include: { asset: true, employee: true, department: true },
      });

      if (shouldResetToInStock) {
        await tx.itAsset.update({
          where: { id: assignment.assetId },
          data: { operatingStatus: OperatingStatus.IN_STOCK },
        });
        return { ...updated, asset: { ...updated.asset, operatingStatus: OperatingStatus.IN_STOCK } };
      }
      // Không đổi gì ở asset - giữ nguyên operatingStatus admin đã set tay.
      return updated;
    });
  }

  private async assertAssetExists(assetId: string): Promise<ItAsset> {
    const asset = await this.prisma.itAsset.findUnique({ where: { id: assetId } });
    if (!asset) throw new BadRequestException(`assetId "${assetId}" không tồn tại`);
    return asset;
  }

  private async assertEmployeeExists(employeeId: string) {
    const exists = await this.prisma.employee.findUnique({ where: { id: employeeId } });
    if (!exists) throw new BadRequestException(`employeeId "${employeeId}" không tồn tại`);
  }

  private async assertDepartmentExists(departmentId: string) {
    const exists = await this.prisma.department.findUnique({ where: { id: departmentId } });
    if (!exists) throw new BadRequestException(`departmentId "${departmentId}" không tồn tại`);
  }
}
