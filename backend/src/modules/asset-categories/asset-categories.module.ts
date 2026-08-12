import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AssetCategoriesController } from './asset-categories.controller';
import { AssetCategoriesService } from './asset-categories.service';

@Module({
  // See AssetsModule/SitesModule for why AuthModule needs to be imported here too.
  imports: [AuthModule],
  controllers: [AssetCategoriesController],
  providers: [AssetCategoriesService],
  exports: [AssetCategoriesService],
})
export class AssetCategoriesModule {}
