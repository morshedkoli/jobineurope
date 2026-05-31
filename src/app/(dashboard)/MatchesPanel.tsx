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
  if (score >= 75) return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300";
  if (score >= 50) return "bg-amber-500/15 text-amber-600 dark:text-amber-300";
  return "bg-black/5 text-muted dark:bg-white/10";
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

  const load = useCallback(() => {
    return fetch("/api/matches?limit=50")
      .then((res) => res.json())
      .then((data) => {
        setItems(data.items ?? []);
        setLoading(false);
      });
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
      setLoading(true);
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Ranking failed");
    } finally {
      setRanking(false);
    }
  }

  return (
    <section className="glass mt-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Ranked matches</h2>
          <p className="text-sm text-muted">
            {loading ? "Loading…" : `${items.length} scored against your profile`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-sm text-muted">
            <input
              type="checkbox"
              checked={visaOnly}
              onChange={(e) => setVisaOnly(e.target.checked)}
            />
            Sponsorship only
          </label>
          <button onClick={rank} disabled={ranking} className="glass-btn glass-btn-primary">
            {ranking ? "Ranking…" : "Rank my matches"}
          </button>
        </div>
      </div>

      {message && <p className="mt-3 text-xs text-muted">{message}</p>}

      <ul className="mt-4 space-y-3">
        {items.map((m) => (
          <li key={m._id} className="glass-soft p-4">
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
                <p className="truncate text-sm text-muted">
                  {[m.job.company, m.job.location || m.job.country, m.job.remote ? "Remote" : null]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  onClick={() => saveToTracker(m.job._id)}
                  disabled={saved.has(m.job._id)}
                  className="glass-btn !px-2.5 !py-1 text-xs"
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
              <p className="mt-2 text-sm text-muted">{m.rationale}</p>
            )}

            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="glass-chip">sponsorship: {m.sponsorshipFit}</span>
              {m.skillGaps.slice(0, 6).map((gap) => (
                <span
                  key={gap}
                  className="rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-medium text-red-600 dark:text-red-300"
                >
                  gap: {gap}
                </span>
              ))}
            </div>

            <CoverLetter jobId={m.job._id} />
          </li>
        ))}
        {!loading && items.length === 0 && (
          <li className="py-6 text-center text-sm text-muted">
            No matches yet. Upload your CV, fetch jobs, then hit “Rank my matches”.
          </li>
        )}
      </ul>
    </section>
  );
}
