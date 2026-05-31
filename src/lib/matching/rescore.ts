import "server-only";
import type { ObjectId } from "mongodb";
import { getCollection } from "@/lib/db/mongo";
import type { ProfileDoc, MatchDoc } from "@/lib/db/schema";
import { embedProfile, embedMissingJobs } from "./embeddings";
import { vectorShortlist, type ShortlistFilter } from "./shortlist";
import { scoreJob } from "./score";
import { ensureVectorIndex } from "./search-index";
import type { ChatProvider, EmbedProvider } from "@/lib/ai";

export interface RescoreResult {
  profileEmbedded: boolean;
  jobsEmbedded: number;
  shortlisted: number;
  scored: number;
}

export interface RescoreOptions {
  visaOnly?: boolean;
  countries?: string[];
  scoreLimit?: number;
}

/**
 * Full matching loop: embed profile + any new jobs, vector-shortlist the best
 * candidates, then LLM-score the top slice and upsert into `matches`.
 */
export async function rescoreMatches(
  userId: ObjectId,
  opts: RescoreOptions = {},
  chat?: ChatProvider,
  embed?: EmbedProvider,
): Promise<RescoreResult> {
  await ensureVectorIndex();

  const profiles = await getCollection<ProfileDoc>("profile");
  const profile = await profiles.findOne({ userId });
  if (!profile?.structuredCv) {
    throw new Error("No parsed CV yet — upload your CV first.");
  }

  let profileEmbedded = false;
  let vector = profile.profileEmbedding;
  if (!vector || vector.length === 0) {
    vector = (await embedProfile(userId, embed)) ?? undefined;
    profileEmbedded = true;
  }
  if (!vector) throw new Error("Could not embed profile.");

  const jobsEmbedded = await embedMissingJobs(200, embed);

  const filter: ShortlistFilter = {
    visaOnly: opts.visaOnly ?? false,
    countries: opts.countries, // undefined = no hard country filter (country data is sparse)
  };
  const shortlist = await vectorShortlist(vector, filter, 50);

  const scoreLimit = opts.scoreLimit ?? Number(process.env.MATCH_SCORE_LIMIT ?? 20);
  const toScore = shortlist.slice(0, scoreLimit);

  const matches = await getCollection<MatchDoc>("matches");
  let scored = 0;
  for (const job of toScore) {
    try {
      const fit = await scoreJob(profile.structuredCv, job, chat);
      await matches.updateOne(
        { userId, jobId: job._id },
        {
          $set: {
            userId,
            jobId: job._id,
            fitScore: fit.fitScore,
            rationale: fit.rationale,
            skillGaps: fit.skillGaps,
            sponsorshipFit: fit.sponsorshipFit,
            scoredAt: new Date(),
          },
        },
        { upsert: true },
      );
      scored += 1;
    } catch (err) {
      console.error(`Scoring failed for job ${job._id}`, err);
    }
  }

  return { profileEmbedded, jobsEmbedded, shortlisted: shortlist.length, scored };
}
