import "server-only";
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;
const TAG_BYTES = 16;

function deriveKey(): Buffer {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not configured");
  return scryptSync(secret, "jobineurope-api-keys", 32);
}

export function encrypt(plaintext: string): { ciphertext: string; iv: string } {
  const key = deriveKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    ciphertext: Buffer.concat([encrypted, tag]).toString("hex"),
    iv: iv.toString("hex"),
  };
}

export function decrypt(ciphertext: string, iv: string): string {
  const key = deriveKey();
  const ivBuf = Buffer.from(iv, "hex");
  const payload = Buffer.from(ciphertext, "hex");
  const encrypted = payload.subarray(0, payload.length - TAG_BYTES);
  const tag = payload.subarray(payload.length - TAG_BYTES);
  const decipher = createDecipheriv(ALGORITHM, key, ivBuf);
  decipher.setAuthTag(tag);
  return decipher.update(encrypted).toString("utf8") + decipher.final("utf8");
}
