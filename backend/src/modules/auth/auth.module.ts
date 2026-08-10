import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { JwtStrategy } from './jwt.strategy';
import { RolesGuard } from './roles.guard';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      // AUTH-01: no default secret - app.module bootstrap (main.ts)
      // already refuses to start if JWT_SECRET is unset, so process.env
      // is guaranteed set by the time this module is constructed.
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: process.env.JWT_EXPIRES_IN || '8h' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtAuthGuard, RolesGuard],
  // Other feature modules (AssetsModule, SitesModule) import AuthModule so
  // JwtAuthGuard/RolesGuard are resolved through Nest's DI graph (RolesGuard
  // needs an injected Reflector) instead of being bare-`new`-ed by
  // @UseGuards(), which would silently break the Reflector injection.
  exports: [JwtStrategy, JwtAuthGuard, RolesGuard, PassportModule, JwtModule],
})
export class AuthModule {}
