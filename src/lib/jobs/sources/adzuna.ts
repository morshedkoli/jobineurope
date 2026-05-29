import { detectVisaSponsorship } from "../visa";
import { stripHtml, type NormalizedJob } from "../types";

/**
 * Adzuna aggregated jobs. Needs a free app id + key.
 * https://developer.adzuna.com
 *
 * Note: Adzuna has NO Romania endpoint. We use it for Germany ("de");
 * Romania coverage comes from Arbeitnow/remote sources (and future adapters).
 */
const BASE = "https://api.adzuna.com/v1/api/jobs";

interface AdzunaJob {
  id: string;
  title: string;
  description: string;
  redirect_url: string;
  company?: { display_name?: string };
  location?: { display_name?: string; area?: string[] };
  salary_min?: number;
  salary_max?: number;
  salary_is_predicted?: string;
  created?: string; // ISO
  contract_time?: string;
  category?: { label?: string };
}

interface AdzunaResponse {
  results: AdzunaJob[];
  count: number;
}

export interface AdzunaQuery {
  country: string; // ISO-2 lower, e.g. "de"
  what?: string; // search terms
  resultsPerPage?: number;
  pages?: number;
}

export function adzunaConfigured(): boolean {
  return Boolean(process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY);
}

export async function fetchAdzuna(query: AdzunaQuery): Promise<NormalizedJob[]> {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  if (!appId || !appKey) {
    throw new Error("Adzuna not configured (ADZUNA_APP_ID / ADZUNA_APP_KEY)");
  }

  const country = query.country.toLowerCase();
  const perPage = query.resultsPerPage ?? 50;
  const pages = query.pages ?? 1;
  const jobs: NormalizedJob[] = [];

  for (let page = 1; page <= pages; page++) {
    const params = new URLSearchParams({
      app_id: appId,
      app_key: appKey,
      results_per_page: String(perPage),
      "content-type": "application/json",
    });
    if (query.what) params.set("what", query.what);

    const url = `${BASE}/${country}/search/${page}?${params.toString()}`;
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) {
      throw new Error(`Adzuna fetch failed (${res.status}) for ${country} p${page}`);
    }
    const body: AdzunaResponse = await res.json();

    for (const j of body.results ?? []) {
      const descriptionText = stripHtml(j.description ?? "");
      jobs.push({
        source: "adzuna",
        externalId: String(j.id),
        title: j.title,
        company: j.company?.display_name,
        location: j.location?.display_name,
        country: country.toUpperCase(),
        remote: /remote/i.test(`${j.title} ${descriptionText}`),
        descriptionText,
        applyUrl: j.redirect_url,
        salary:
          j.salary_min || j.salary_max
            ? { min: j.salary_min, max: j.salary_max, currency: "EUR" }
            : undefined,
        tags: [j.category?.label, j.contract_time].filter((t): t is string => Boolean(t)),
        mentionsVisaSponsorship: detectVisaSponsorship(j.title, descriptionText),
        postedAt: j.created ? new Date(j.created) : undefined,
      });
    }

    if ((body.results?.length ?? 0) < perPage) break; // no more pages
  }

  return jobs;
}
