import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AssetsModule } from './modules/assets/assets.module';
import { SitesModule } from './modules/sites/sites.module';
import { CredentialsModule } from './modules/credentials/credentials.module';

// NOTE (phase discipline): assignments / maintenance / software-licenses /
// auth / users modules are intentionally not scaffolded yet. This chat's
// phase is "core data model + assets/sites/credentials scaffold" only.
// Add each remaining module following the AssetsModule pattern
// (controller + service + dto) in a follow-up phase.
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AssetsModule,
    SitesModule,
    CredentialsModule,
  ],
})
export class AppModule {}
