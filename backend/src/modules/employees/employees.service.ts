import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class EmployeesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.employee.findMany({
      include: { department: { include: { site: true } } },
      orderBy: { fullName: 'asc' },
    });
  }

  async findOne(id: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      include: { department: { include: { site: true } }, assignments: { orderBy: { handoverDate: 'desc' } } },
    });
    if (!employee) throw new NotFoundException(`Employee ${id} not found`);
    return employee;
  }
}
