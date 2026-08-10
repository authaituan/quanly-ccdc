import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { AssetsService } from './assets.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';

@Controller('assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Get()
  findAll(@Query('categoryId') categoryId?: string, @Query('siteId') siteId?: string) {
    return this.assetsService.findAll({ categoryId, siteId });
  }

  @Get('expiring-soon')
  findExpiringSoon() {
    return this.assetsService.findExpiringSoon();
  }

  @Get('by-tag/:assetTag')
  findByAssetTag(@Param('assetTag') assetTag: string) {
    // Called by the mobile-web QR scanner after decoding the tag on the sticker.
    return this.assetsService.findByAssetTag(assetTag);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.assetsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateAssetDto) {
    return this.assetsService.create(dto);
  }

  // AST-04
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateAssetDto) {
    return this.assetsService.update(id, dto);
  }

  // AST-05: soft delete - chuyển operatingStatus sang DECOMMISSIONED,
  // KHÔNG xóa dòng khỏi DB (quyết định 2026-08-10, xem assets.service.ts).
  @Delete(':id')
  decommission(@Param('id') id: string) {
    return this.assetsService.decommission(id);
  }
}
