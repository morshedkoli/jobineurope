import "server-only";
import type { WithId } from "mongodb";
import { getCollection } from "@/lib/db/mongo";
import type { JobDoc } from "@/lib/db/schema";
import { VECTOR_INDEX_NAME } from "./search-index";

export interface ShortlistFilter {
  countries?: string[];
  visaOnly?: boolean;
}

export type ScoredJob = WithId<JobDoc> & { score: number };

function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na && nb ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
}

function buildFilter(filter: ShortlistFilter): Record<string, unknown> {
  const f: Record<string, unknown> = {};
  if (filter.countries?.length) f.country = { $in: filter.countries };
  if (filter.visaOnly) f.mentionsVisaSponsorship = true;
  return f;
}

/**
 * Top-k jobs by similarity to the query vector. Tries Atlas $vectorSearch
 * first; falls back to in-memory cosine so matching works on any deployment
 * (local Mongo, free tier without an index, or while the index is still building).
 */
export async function vectorShortlist(
  query: number[],
  filter: ShortlistFilter = {},
  k = 50,
): Promise<ScoredJob[]> {
  const jobs = await getCollection<JobDoc>("jobs");
  const mongoFilter = buildFilter(filter);

  try {
    const pipeline = [
      {
        $vectorSearch: {
          index: VECTOR_INDEX_NAME,
          path: "jobEmbedding",
          queryVector: query,
          numCandidates: Math.max(k * 4, 100),
          limit: k,
          ...(Object.keys(mongoFilter).length ? { filter: mongoFilter } : {}),
        },
      },
      { $addFields: { score: { $meta: "vectorSearchScore" } } },
    ];
    const res = (await jobs.aggregate(pipeline).toArray()) as ScoredJob[];
    if (res.length > 0) return res;
  } catch {
    // No vector index / not Atlas — fall through to cosine.
  }

  const candidates = await jobs
    .find({ ...mongoFilter, jobEmbedding: { $exists: true } })
    .toArray();

  return candidates
    .map((j) => ({ ...j, score: cosine(query, j.jobEmbedding ?? []) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}
