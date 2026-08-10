import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CredentialsController } from './credentials.controller';
import { CredentialsService } from './credentials.service';
import { EncryptionService } from '../../common/crypto/encryption.service';

// CRED-02/03/04 (2026-08-10): controller wired now that AuthModule
// (JwtAuthGuard/RolesGuard) exists. AuthModule imported so RolesGuard's
// injected Reflector resolves through Nest's DI graph (same pattern as
// AssetsModule/SitesModule - see those for why).
@Module({
  imports: [AuthModule],
  controllers: [CredentialsController],
  providers: [CredentialsService, EncryptionService],
  exports: [CredentialsService],
})
export class CredentialsModule {}
