import { Module } from '@nestjs/common';
import { CredentialsService } from './credentials.service';
import { EncryptionService } from '../../common/crypto/encryption.service';

// No controller wired yet on purpose: exposing credential read/write over
// HTTP needs the auth/RolesGuard from the auth module finished first
// (see README "Chưa hoàn thiện"). Service is ready and unit-testable.
@Module({
  providers: [CredentialsService, EncryptionService],
  exports: [CredentialsService],
})
export class CredentialsModule {}
