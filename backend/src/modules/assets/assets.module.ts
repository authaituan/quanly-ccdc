import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AssetsController } from './assets.controller';
import { AssetsService } from './assets.service';

@Module({
  // AuthModule imported so JwtAuthGuard/RolesGuard used in
  // AssetsController are resolved through Nest's DI graph (RolesGuard
  // needs an injected Reflector) rather than instantiated bare.
  imports: [AuthModule],
  controllers: [AssetsController],
  providers: [AssetsService],
  exports: [AssetsService],
})
export class AssetsModule {}
