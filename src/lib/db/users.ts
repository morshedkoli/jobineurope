import { getCollection } from "./mongo";
import type { UserDoc } from "./schema";

/**
 * Look up a user by email for credentials authentication.
 * Emails are stored lowercased; callers should not assume casing.
 */
export async function getUserByEmail(email: string): Promise<UserDoc | null> {
  const users = await getCollection<UserDoc>("users");
  return users.findOne({ email: email.toLowerCase() });
}
