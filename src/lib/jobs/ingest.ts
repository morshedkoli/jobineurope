import "server-only";
import { getCollection } from "@/lib/db/mongo";
import type { JobDoc } from "@/lib/db/schema";
import type { NormalizedJob } from "./types";
import { fetchArbeitnow } from "./sources/arbeitnow";
import { fetchAdzuna, adzunaConfigured } from "./sources/adzuna";

export interface SourceResult {
  source: string;
  fetched: number;
  upserted: number;
  skipped?: string;
  error?: string;
}

export interface IngestResult {
  startedAt: string;
  results: SourceResult[];
  totalUpserted: number;
}

let indexesEnsured = false;

async function ensureIndexes(): Promise<void> {
  if (indexesEnsured) return;
  const jobs = await getCollection<JobDoc>("jobs");
  await jobs.createIndexes([
    { key: { source: 1, externalId: 1 }, unique: true, name: "source_externalId" },
    { key: { country: 1 }, name: "country" },
    { key: { mentionsVisaSponsorship: 1 }, name: "visa" },
    { key: { postedAt: -1 }, name: "postedAt" },
  ]);
  indexesEnsured = true;
}

/** Upsert normalized jobs, keyed on (source, externalId). Preserves embeddings. */
async function upsertJobs(items: NormalizedJob[]): Promise<number> {
  if (items.length === 0) return 0;
  const jobs = await getCollection<JobDoc>("jobs");
  const now = new Date();

  const ops = items.map((job) => ({
    updateOne: {
      filter: { source: job.source, externalId: job.externalId },
      update: {
        $set: { ...job, fetchedAt: now },
        // Do not touch jobEmbedding here; Phase 3 computes/refreshes it.
      },
      upsert: true,
    },
  }));

  const res = await jobs.bulkWrite(ops, { ordered: false });
  return res.upsertedCount + res.modifiedCount;
}

async function runSource(
  source: string,
  fetcher: () => Promise<NormalizedJob[]>,
): Promise<SourceResult> {
  try {
    const items = await fetcher();
    const upserted = await upsertJobs(items);
    return { source, fetched: items.length, upserted };
  } catch (err) {
    return {
      source,
      fetched: 0,
      upserted: 0,
      error: err instanceof Error ? err.message : "unknown error",
    };
  }
}

/**
 * Fetch from all configured sources for the user's target markets
 * (Germany via Adzuna, Europe/remote via Arbeitnow) and upsert.
 */
export async function ingestAll(): Promise<IngestResult> {
  await ensureIndexes();
  const startedAt = new Date().toISOString();
  const results: SourceResult[] = [];

  // Arbeitnow — no key needed; EU/remote + visa roles.
  results.push(await runSource("arbeitnow", () => fetchArbeitnow(1)));

  // Adzuna — Germany only (no Romania endpoint). Skip cleanly if unconfigured.
  if (adzunaConfigured()) {
    results.push(
      await runSource("adzuna:de", () =>
        fetchAdzuna({ country: "de", what: "javascript developer", pages: 1 }),
      ),
    );
  } else {
    results.push({
      source: "adzuna:de",
      fetched: 0,
      upserted: 0,
      skipped: "ADZUNA_APP_ID / ADZUNA_APP_KEY not set",
    });
  }

  const totalUpserted = results.reduce((sum, r) => sum + r.upserted, 0);
  return { startedAt, results, totalUpserted };
}
