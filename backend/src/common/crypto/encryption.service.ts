import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

/**
 * AES-256-GCM field-level encryption for sensitive columns
 * (VPN / FortiClient credentials, license keys). Key comes from
 * CREDENTIALS_ENCRYPTION_KEY (32-byte base64, see .env.example) and never
 * lives in the database or in source control.
 *
 * Storage format: base64(iv) + ":" + base64(authTag) + ":" + base64(ciphertext)
 */
@Injectable()
export class EncryptionService {
  private readonly key: Buffer;

  constructor(config: ConfigService) {
    const b64Key = config.get<string>('CREDENTIALS_ENCRYPTION_KEY');
    if (!b64Key) {
      throw new Error('CREDENTIALS_ENCRYPTION_KEY is not set');
    }
    this.key = Buffer.from(b64Key, 'base64');
  }

  encrypt(plainText: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const ciphertext = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return `${iv.toString('base64')}:${authTag.toString('base64')}:${ciphertext.toString('base64')}`;
  }

  decrypt(payload: string): string {
    const [ivB64, tagB64, dataB64] = payload.split(':');
    const decipher = createDecipheriv('aes-256-gcm', this.key, Buffer.from(ivB64, 'base64'));
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
    const plain = Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]);
    return plain.toString('utf8');
  }
}
