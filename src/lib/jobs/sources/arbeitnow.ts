import { detectVisaSponsorship } from "../visa";
import { stripHtml, type NormalizedJob } from "../types";

/**
 * Arbeitnow public job-board API (no auth). Europe/remote focused, strong
 * German market, and surfaces visa-sponsorship roles — ideal for our filter.
 * https://www.arbeitnow.com/api/job-board-api
 */
const ENDPOINT = "https://www.arbeitnow.com/api/job-board-api";

interface ArbeitnowJob {
  slug: string;
  company_name: string;
  title: string;
  description: string; // HTML
  remote: boolean;
  url: string;
  tags: string[];
  job_types: string[];
  location: string;
  created_at: number; // unix seconds
  visa_sponsorship?: boolean;
}

interface ArbeitnowResponse {
  data: ArbeitnowJob[];
  links?: { next?: string | null };
}

/** Infer ISO-2 country from a free-text location (best effort). */
function inferCountry(location: string): string | undefined {
  const l = location.toLowerCase();
  if (/germany|deutschland|berlin|munich|münchen|hamburg|cologne|köln|frankfurt|stuttgart/.test(l))
    return "DE";
  if (/romania|bucharest|bucurești|cluj|timisoara|timișoara|iasi|iași/.test(l)) return "RO";
  return undefined;
}

export async function fetchArbeitnow(maxPages = 1): Promise<NormalizedJob[]> {
  const jobs: NormalizedJob[] = [];
  let url: string | null = ENDPOINT;
  let page = 0;

  while (url && page < maxPages) {
    const res: Response = await fetch(url, {
      headers: { Accept: "application/json" },
      // Arbeitnow data changes slowly; let Next cache briefly server-side.
      next: { revalidate: 3600 },
    });
    if (!res.ok) {
      throw new Error(`Arbeitnow fetch failed (${res.status})`);
    }
    const body: ArbeitnowResponse = await res.json();

    for (const j of body.data ?? []) {
      const descriptionText = stripHtml(j.description ?? "");
      const mentionsVisaSponsorship =
        j.visa_sponsorship === true ||
        detectVisaSponsorship(j.title, descriptionText, j.tags?.join(" "));

      jobs.push({
        source: "arbeitnow",
        externalId: j.slug,
        title: j.title,
        company: j.company_name,
        location: j.location,
        country: inferCountry(j.location),
        remote: Boolean(j.remote),
        descriptionText,
        applyUrl: j.url,
        tags: [...(j.tags ?? []), ...(j.job_types ?? [])],
        mentionsVisaSponsorship,
        postedAt: j.created_at ? new Date(j.created_at * 1000) : undefined,
      });
    }

    url = body.links?.next ?? null;
    page += 1;
  }

  return jobs;
}
