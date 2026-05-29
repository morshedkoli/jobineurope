import "server-only";
import { getCollection } from "@/lib/db/mongo";
import type { JobDoc } from "@/lib/db/schema";

export const VECTOR_INDEX_NAME = process.env.VECTOR_INDEX_NAME ?? "job_vectors";

let attempted = false;

/**
 * Create the Atlas Vector Search index on jobs.jobEmbedding (best effort).
 * Idempotent in practice: if the index exists, or the deployment isn't Atlas,
 * we swallow the error — the cosine fallback in shortlist.ts keeps matching working.
 */
export async function ensureVectorIndex(): Promise<void> {
  if (attempted) return;
  attempted = true;
  try {
    const jobs = await getCollection<JobDoc>("jobs");
    const numDimensions = Number(process.env.EMBED_DIMENSIONS ?? 1024);
    await jobs.createSearchIndex({
      name: VECTOR_INDEX_NAME,
      type: "vectorSearch",
      definition: {
        fields: [
          { type: "vector", path: "jobEmbedding", numDimensions, similarity: "cosine" },
          { type: "filter", path: "country" },
          { type: "filter", path: "mentionsVisaSponsorship" },
        ],
      },
    });
  } catch {
    // Index already exists or vector search unavailable — fallback covers it.
  }
}
