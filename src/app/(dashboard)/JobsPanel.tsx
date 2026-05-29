"use client";

import { useCallback, useEffect, useState } from "react";

interface JobListItem {
  _id: string;
  title: string;
  company?: string;
  location?: string;
  country?: string;
  remote?: boolean;
  applyUrl: string;
  mentionsVisaSponsorship: boolean;
  source: string;
  postedAt?: string;
}

interface IngestResult {
  totalUpserted: number;
  results: Array<{ source: string; fetched: number; upserted: number; skipped?: string; error?: string }>;
}

export function JobsPanel() {
  const [items, setItems] = useState<JobListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [visaOnly, setVisaOnly] = useState(true);
  const [loading, setLoading] = useState(true);
  const [ingesting, setIngesting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/jobs?limit=25${visaOnly ? "&visa=1" : ""}`);
    const data = await res.json();
    setItems(data.items ?? []);
    setTotal(data.total ?? 0);
    setLoading(false);
  }, [visaOnly]);

  useEffect(() => {
    void load();
  }, [load]);

  async function refresh() {
    setIngesting(true);
    setMessage(null);
    try {
      const res = await fetch("/api/jobs/ingest", { method: "POST" });
      const data: IngestResult = await res.json();
      if (!res.ok) throw new Error("Ingestion failed");
      const detail = data.results
        .map((r) => `${r.source}: ${r.error ? `error (${r.error})` : r.skipped ? "skipped" : `${r.upserted} saved`}`)
        .join(" · ");
      setMessage(`Fetched. ${detail}`);
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Ingestion failed");
    } finally {
      setIngesting(false);
    }
  }

  return (
    <section className="mt-6 rounded-2xl border border-black/10 bg-white p-6 dark:border-white/10 dark:bg-neutral-900">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Jobs</h2>
          <p className="text-sm text-neutral-500">
            {loading ? "Loading…" : `${total} job${total === 1 ? "" : "s"} ${visaOnly ? "with sponsorship signal" : "total"}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-sm text-neutral-500">
            <input
              type="checkbox"
              checked={visaOnly}
              onChange={(e) => setVisaOnly(e.target.checked)}
            />
            Sponsorship only
          </label>
          <button
            onClick={refresh}
            disabled={ingesting}
            className="rounded-lg bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900"
          >
            {ingesting ? "Fetching…" : "Refresh jobs"}
          </button>
        </div>
      </div>

      {message && <p className="mt-3 text-xs text-neutral-500">{message}</p>}

      <ul className="mt-4 divide-y divide-black/5 dark:divide-white/5">
        {items.map((job) => (
          <li key={job._id} className="flex items-start justify-between gap-3 py-3">
            <div className="min-w-0">
              <a
                href={job.applyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium hover:underline"
              >
                {job.title}
              </a>
              <p className="truncate text-sm text-neutral-500">
                {[job.company, job.location || job.country, job.remote ? "Remote" : null]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              {job.mentionsVisaSponsorship && (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
                  Visa
                </span>
              )}
              <span className="rounded-md bg-black/5 px-2 py-0.5 text-xs text-neutral-500 dark:bg-white/10">
                {job.source}
              </span>
            </div>
          </li>
        ))}
        {!loading && items.length === 0 && (
          <li className="py-6 text-center text-sm text-neutral-500">
            No jobs yet. Hit “Refresh jobs” to fetch from Arbeitnow{` `}
            {/* Adzuna also if configured */}and Adzuna.
          </li>
        )}
      </ul>
    </section>
  );
}
