import { Injectable } from '@nestjs/common';
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);

@Injectable()
export class PasswordService {
  async hash(password: string): Promise<string> {
    const salt = randomBytes(16).toString('hex');
    const derivedKey = (await scrypt(password, salt, 64)) as Buffer;

    return `${salt}:${derivedKey.toString('hex')}`;
  }

  async compare(password: string, passwordHash: string): Promise<boolean> {
    const [salt, hashedPassword] = passwordHash.split(':');

    if (!salt || !hashedPassword) {
      return false;
    }

    const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
    const hashedPasswordBuffer = Buffer.from(hashedPassword, 'hex');

    if (derivedKey.length !== hashedPasswordBuffer.length) {
      return false;
    }

    return timingSafeEqual(derivedKey, hashedPasswordBuffer);
  }
}
