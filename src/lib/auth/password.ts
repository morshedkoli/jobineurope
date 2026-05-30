import { scryptSync, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Password hashing using Node's built-in scrypt (no external deps).
 * Stored format is `salt:derivedKey`, both hex-encoded.
 */

const KEYLEN = 64;
const SALT_BYTES = 16;

export function hashPassword(password: string): string {
  const salt = randomBytes(SALT_BYTES).toString("hex");
  const derived = scryptSync(password, salt, KEYLEN).toString("hex");
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;

  const derived = scryptSync(password, salt, KEYLEN);
  const expected = Buffer.from(hash, "hex");
  // Reject mismatched lengths before timingSafeEqual (which throws otherwise).
  if (derived.length !== expected.length) return false;

  return timingSafeEqual(derived, expected);
}
