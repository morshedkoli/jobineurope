import "server-only";
import { ObjectId } from "mongodb";
import { getCollection } from "./mongo";
import { encrypt, decrypt } from "./crypto";
import type { UserApiKeyDoc } from "./schema";

export async function getApiKey(userId: string, keyName: string): Promise<string | null> {
  const col = await getCollection<UserApiKeyDoc>("userApiKeys");
  const doc = await col.findOne({ userId: new ObjectId(userId), keyName });
  if (!doc) return null;
  try {
    return decrypt(doc.ciphertext, doc.iv);
  } catch {
    return null;
  }
}

export async function setApiKey(
  userId: string,
  keyName: string,
  plaintext: string,
): Promise<void> {
  const { ciphertext, iv } = encrypt(plaintext.trim());
  const col = await getCollection<UserApiKeyDoc>("userApiKeys");
  await col.updateOne(
    { userId: new ObjectId(userId), keyName },
    {
      $set: { ciphertext, iv, updatedAt: new Date() },
      $setOnInsert: { userId: new ObjectId(userId), keyName },
    },
    { upsert: true },
  );
}

export async function deleteApiKey(userId: string, keyName: string): Promise<void> {
  const col = await getCollection<UserApiKeyDoc>("userApiKeys");
  await col.deleteOne({ userId: new ObjectId(userId), keyName });
}

/** Returns only key names (never values) — safe to send to the client. */
export async function listApiKeyNames(userId: string): Promise<string[]> {
  const col = await getCollection<UserApiKeyDoc>("userApiKeys");
  const docs = await col
    .find({ userId: new ObjectId(userId) }, { projection: { keyName: 1 } })
    .toArray();
  return docs.map((d) => d.keyName);
}
