import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { AssetsService } from './assets.service';
import { CreateAssetDto } from './dto/create-asset.dto';

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
}
