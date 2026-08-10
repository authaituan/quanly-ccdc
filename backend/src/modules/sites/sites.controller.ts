import { Controller, Get, Param } from '@nestjs/common';
import { SitesService } from './sites.service';

@Controller('sites')
export class SitesController {
  constructor(private readonly sitesService: SitesService) {}

  @Get()
  findAll() {
    return this.sitesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    // Includes racks + placements, powering the interactive rack visualizer.
    return this.sitesService.findOne(id);
  }
}
