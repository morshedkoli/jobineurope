import type { JobDoc } from "@/lib/db/schema";

/** A job as produced by a source client, before persistence/embedding. */
export type NormalizedJob = Omit<JobDoc, "_id" | "jobEmbedding" | "fetchedAt">;

/** Strip HTML tags + collapse whitespace from a description blob. */
export function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}
