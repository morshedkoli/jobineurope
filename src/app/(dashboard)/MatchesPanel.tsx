"use client";

import { useCallback, useEffect, useState } from "react";
import { CoverLetter } from "./CoverLetter";

interface MatchItem {
  _id: string;
  fitScore: number;
  rationale: string;
  skillGaps: string[];
  sponsorshipFit: string;
  job: {
    _id: string;
    title: string;
    company?: string;
    location?: string;
    country?: string;
    remote?: boolean;
    applyUrl: string;
    source: string;
    mentionsVisaSponsorship: boolean;
  };
}

function scoreColor(score: number): string {
  if (score >= 75) return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200";
  if (score >= 50) return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200";
  return "bg-neutral-200 text-neutral-700 dark:bg-white/10 dark:text-neutral-300";
}

export function MatchesPanel() {
  const [items, setItems] = useState<MatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [ranking, setRanking] = useState(false);
  const [visaOnly, setVisaOnly] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [saved, setSaved] = useState<Set<string>>(new Set());

  async function saveToTracker(jobId: string) {
    setSaved((prev) => new Set(prev).add(jobId)); // optimistic
    const res = await fetch("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId }),
    });
    if (res.ok) {
      window.dispatchEvent(new Event("tracker:changed"));
    } else {
      setSaved((prev) => {
        const next = new Set(prev);
        next.delete(jobId);
        return next;
      });
    }
  }

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/matches?limit=50");
    const data = await res.json();
    setItems(data.items ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function rank() {
    setRanking(true);
    setMessage(null);
    try {
      const res = await fetch("/api/matches/rescore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visaOnly }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Ranking failed");
      setMessage(
        `Scored ${data.scored} of ${data.shortlisted} shortlisted` +
          (data.jobsEmbedded ? ` · embedded ${data.jobsEmbedded} new jobs` : ""),
      );
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Ranking failed");
    } finally {
      setRanking(false);
    }
  }

  return (
    <section className="mt-6 rounded-2xl border border-black/10 bg-white p-6 dark:border-white/10 dark:bg-neutral-900">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Ranked matches</h2>
          <p className="text-sm text-neutral-500">
            {loading ? "Loading…" : `${items.length} scored against your profile`}
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
            onClick={rank}
            disabled={ranking}
            className="rounded-lg bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900"
          >
            {ranking ? "Ranking…" : "Rank my matches"}
          </button>
        </div>
      </div>

      {message && <p className="mt-3 text-xs text-neutral-500">{message}</p>}

      <ul className="mt-4 space-y-3">
        {items.map((m) => (
          <li
            key={m._id}
            className="rounded-xl border border-black/5 p-4 dark:border-white/5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <a
                  href={m.job.applyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium hover:underline"
                >
                  {m.job.title}
                </a>
                <p className="truncate text-sm text-neutral-500">
                  {[m.job.company, m.job.location || m.job.country, m.job.remote ? "Remote" : null]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  onClick={() => saveToTracker(m.job._id)}
                  disabled={saved.has(m.job._id)}
                  className="rounded-lg border border-black/15 px-2.5 py-1 text-xs font-medium disabled:opacity-50 dark:border-white/20"
                >
                  {saved.has(m.job._id) ? "Saved ✓" : "Save to tracker"}
                </button>
                <span
                  className={`rounded-full px-2.5 py-1 text-sm font-semibold ${scoreColor(m.fitScore)}`}
                >
                  {m.fitScore}
                </span>
              </div>
            </div>

            {m.rationale && (
              <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
                {m.rationale}
              </p>
            )}

            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="rounded-md bg-black/5 px-2 py-0.5 text-xs text-neutral-500 dark:bg-white/10">
                sponsorship: {m.sponsorshipFit}
              </span>
              {m.skillGaps.slice(0, 6).map((gap) => (
                <span
                  key={gap}
                  className="rounded-md bg-red-50 px-2 py-0.5 text-xs text-red-700 dark:bg-red-900/30 dark:text-red-200"
                >
                  gap: {gap}
                </span>
              ))}
            </div>

            <CoverLetter jobId={m.job._id} />
          </li>
        ))}
        {!loading && items.length === 0 && (
          <li className="py-6 text-center text-sm text-neutral-500">
            No matches yet. Upload your CV, fetch jobs, then hit “Rank my matches”.
          </li>
        )}
      </ul>
    </section>
  );
}
