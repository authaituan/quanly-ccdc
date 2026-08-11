import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AssetsModule } from './modules/assets/assets.module';
import { SitesModule } from './modules/sites/sites.module';
import { CredentialsModule } from './modules/credentials/credentials.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';

// NOTE (phase discipline): assignments / maintenance / software-licenses
// modules are intentionally not scaffolded yet. AuthModule (AUTH-01,
// AUTH-02) added 2026-08-10. UsersModule (USER-01) added 2026-08-11.
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    AssetsModule,
    SitesModule,
    CredentialsModule,
    UsersModule,
  ],
})
export class AppModule {}
