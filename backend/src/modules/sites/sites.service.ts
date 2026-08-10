import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SitesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.site.findMany({ include: { racks: true } });
  }

  findOne(id: string) {
    return this.prisma.site.findUnique({
      where: { id },
      include: { racks: { include: { placements: true } }, assets: true, departments: true },
    });
  }
}
