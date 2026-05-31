import "server-only";
import { ObjectId } from "mongodb";
import { getCollection } from "@/lib/db/mongo";
import type { UserDoc } from "@/lib/db/schema";

export type UserSettings = NonNullable<UserDoc["settings"]>;

export const DEFAULT_SETTINGS: UserSettings = {
  targetCountries: ["DE", "RO"],
  englishOnly: true,
  needsVisaSponsorship: true,
};

/** Read a user's preferences, falling back to sensible Europe defaults. */
export async function getSettings(userId: string): Promise<UserSettings> {
  const users = await getCollection<UserDoc>("users");
  const user = await users.findOne(
    { _id: new ObjectId(userId) },
    { projection: { settings: 1 } },
  );
  return { ...DEFAULT_SETTINGS, ...(user?.settings ?? {}) };
}

/** Persist preferences. Returns the merged, stored settings. */
export async function updateSettings(
  userId: string,
  patch: Partial<UserSettings>,
): Promise<UserSettings> {
  const current = await getSettings(userId);
  const next: UserSettings = { ...current, ...patch };
  const users = await getCollection<UserDoc>("users");
  await users.updateOne({ _id: new ObjectId(userId) }, { $set: { settings: next } });
  return next;
}
