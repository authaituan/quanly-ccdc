import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EncryptionService } from '../../common/crypto/encryption.service';
import { UserRole } from '@prisma/client';

interface UpsertCredentialInput {
  assetId: string;
  vpnUsername?: string;
  vpnPassword?: string;
  fortiClientUsername?: string;
  fortiClientPassword?: string;
}

/**
 * Restricted access: only IT_ADMIN may read decrypted secrets. Everyone
 * else gets metadata only (e.g. "has VPN credential: yes/no").
 * Route guard wiring (RolesGuard) is left to the auth module - this
 * service enforces the rule at the data-access layer as a second line
 * of defense.
 */
@Injectable()
export class CredentialsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  async upsert(input: UpsertCredentialInput, requesterRole: UserRole) {
    this.assertIsAdmin(requesterRole);
    const { assetId, vpnUsername, vpnPassword, fortiClientUsername, fortiClientPassword } = input;

    return this.prisma.networkAccessCredential.upsert({
      where: { assetId },
      create: {
        assetId,
        vpnUsername,
        vpnPasswordEncrypted: vpnPassword ? this.encryption.encrypt(vpnPassword) : undefined,
        fortiClientUsername,
        fortiClientPasswordEncrypted: fortiClientPassword
          ? this.encryption.encrypt(fortiClientPassword)
          : undefined,
      },
      update: {
        vpnUsername,
        vpnPasswordEncrypted: vpnPassword ? this.encryption.encrypt(vpnPassword) : undefined,
        fortiClientUsername,
        fortiClientPasswordEncrypted: fortiClientPassword
          ? this.encryption.encrypt(fortiClientPassword)
          : undefined,
      },
    });
  }

  async reveal(assetId: string, requesterRole: UserRole) {
    this.assertIsAdmin(requesterRole);
    const record = await this.prisma.networkAccessCredential.findUnique({ where: { assetId } });
    if (!record) return null;
    return {
      vpnUsername: record.vpnUsername,
      vpnPassword: record.vpnPasswordEncrypted ? this.encryption.decrypt(record.vpnPasswordEncrypted) : null,
      fortiClientUsername: record.fortiClientUsername,
      fortiClientPassword: record.fortiClientPasswordEncrypted
        ? this.encryption.decrypt(record.fortiClientPasswordEncrypted)
        : null,
    };
  }

  private assertIsAdmin(role: UserRole) {
    if (role !== UserRole.IT_ADMIN) {
      throw new ForbiddenException('Only IT_ADMIN may read or write network access credentials');
    }
  }
}
