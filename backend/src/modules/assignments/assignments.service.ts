import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AssignmentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { ReturnAssignmentDto } from './dto/return-assignment.dto';

// ASSIGN-01, quyết định 2026-08-11: KHÔNG chặn nhiều assignment ACTIVE
// cùng lúc trên 1 asset (thực tế nghiệp vụ có thể không theo chuẩn).
// KHÔNG tự đồng bộ ItAsset.operatingStatus khi cấp phát/thu hồi - giữ
// độc lập, người dùng tự cập nhật qua PATCH /assets/:id nếu cần.
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
    await this.assertAssetExists(dto.assetId);
    if (dto.employeeId) await this.assertEmployeeExists(dto.employeeId);
    if (dto.departmentId) await this.assertDepartmentExists(dto.departmentId);

    return this.prisma.endUserAssignment.create({
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
  }

  async returnAssignment(id: string, dto: ReturnAssignmentDto) {
    const assignment = await this.findOne(id);
    if (assignment.status !== AssignmentStatus.ACTIVE) {
      throw new BadRequestException(
        `Assignment ${id} đang ở trạng thái "${assignment.status}", không thể thu hồi (chỉ thu hồi được assignment đang ACTIVE)`,
      );
    }
    return this.prisma.endUserAssignment.update({
      where: { id },
      data: {
        status: AssignmentStatus.RETURNED,
        actualReturnDate: dto.actualReturnDate ? new Date(dto.actualReturnDate) : new Date(),
      },
      include: { asset: true, employee: true, department: true },
    });
  }

  private async assertAssetExists(assetId: string) {
    const exists = await this.prisma.itAsset.findUnique({ where: { id: assetId } });
    if (!exists) throw new BadRequestException(`assetId "${assetId}" không tồn tại`);
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
