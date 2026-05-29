import "server-only";
import type { ObjectId } from "mongodb";
import { getCollection } from "@/lib/db/mongo";
import { embedProvider } from "@/lib/ai";
import { profileToText, jobToText } from "@/lib/ai/embed-text";
import type { ProfileDoc, JobDoc } from "@/lib/db/schema";

const EMBED_BATCH = 32; // cap per request; some providers limit input count

async function embedInBatches(texts: string[]): Promise<number[][]> {
  const provider = embedProvider();
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += EMBED_BATCH) {
    const batch = texts.slice(i, i + EMBED_BATCH);
    out.push(...(await provider.embed(batch)));
  }
  return out;
}

/** Embed the user's profile and persist the vector. Returns it, or null if no CV. */
export async function embedProfile(userId: ObjectId): Promise<number[] | null> {
  const profiles = await getCollection<ProfileDoc>("profile");
  const profile = await profiles.findOne({ userId });
  if (!profile?.structuredCv) return null;

  const [vector] = await embedProvider().embed([profileToText(profile)]);
  await profiles.updateOne(
    { userId },
    { $set: { profileEmbedding: vector, updatedAt: new Date() } },
  );
  return vector;
}

/** Embed jobs that don't yet have a vector. Returns how many were embedded. */
export async function embedMissingJobs(limit = 200): Promise<number> {
  const jobs = await getCollection<JobDoc>("jobs");
  const missing = await jobs
    .find({ jobEmbedding: { $exists: false } })
    .limit(limit)
    .toArray();
  if (missing.length === 0) return 0;

  const vectors = await embedInBatches(missing.map((j) => jobToText(j)));
  await Promise.all(
    missing.map((j, i) =>
      jobs.updateOne({ _id: j._id }, { $set: { jobEmbedding: vectors[i] } }),
    ),
  );
  return missing.length;
}
