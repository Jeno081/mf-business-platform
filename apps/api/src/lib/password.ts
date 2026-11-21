import { argon2id, argon2Verify } from 'hash-wasm';
import { randomBytes } from 'node:crypto';

const ARGON2_OPTIONS = {
  parallelism: 1,
  iterations: 3,
  memorySize: 19_456,
  hashLength: 32,
};

export async function hashPassword(password: string): Promise<string> {
  return argon2id({
    password,
    salt: randomBytes(16),
    ...ARGON2_OPTIONS,
    outputType: 'encoded',
  });
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    return await argon2Verify({ password, hash });
  } catch {
    return false;
  }
}
