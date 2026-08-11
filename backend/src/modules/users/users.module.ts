import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  // AuthModule imported để JwtAuthGuard/RolesGuard resolve đúng qua DI
  // (RolesGuard cần inject Reflector) - cùng pattern AssetsModule/
  // SitesModule/CredentialsModule.
  imports: [AuthModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
