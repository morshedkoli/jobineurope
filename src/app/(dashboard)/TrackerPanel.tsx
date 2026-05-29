"use client";

import { useCallback, useEffect, useState } from "react";

const STATUSES = ["saved", "applied", "screening", "interview", "offer", "rejected"] as const;
type Status = (typeof STATUSES)[number];

const STATUS_LABELS: Record<Status, string> = {
  saved: "Saved",
  applied: "Applied",
  screening: "Screening",
  interview: "Interview",
  offer: "Offer",
  rejected: "Rejected",
};

interface Application {
  _id: string;
  status: Status;
  notes?: string;
  job: {
    _id: string;
    title: string;
    company?: string;
    location?: string;
    country?: string;
    applyUrl: string;
  } | null;
}

export function TrackerPanel() {
  const [items, setItems] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/applications");
    const data = await res.json();
    setItems(data.items ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
    const onChange = () => void load();
    window.addEventListener("tracker:changed", onChange);
    return () => window.removeEventListener("tracker:changed", onChange);
  }, [load]);

  function patch(id: string, next: Application) {
    setItems((prev) => prev.map((a) => (a._id === id ? next : a)));
  }

  async function changeStatus(app: Application, status: Status) {
    patch(app._id, { ...app, status }); // optimistic
    const res = await fetch(`/api/applications/${app._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) void load(); // roll back to server truth
  }

  async function saveNotes(app: Application, notes: string) {
    if (notes === (app.notes ?? "")) return;
    await fetch(`/api/applications/${app._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes }),
    });
    patch(app._id, { ...app, notes });
  }

  async function remove(app: Application) {
    setItems((prev) => prev.filter((a) => a._id !== app._id));
    await fetch(`/api/applications/${app._id}`, { method: "DELETE" });
  }

  return (
    <section className="mt-6 rounded-2xl border border-black/10 bg-white p-6 dark:border-white/10 dark:bg-neutral-900">
      <h2 className="text-lg font-semibold">Application tracker</h2>
      <p className="mt-1 text-sm text-neutral-500">
        {loading ? "Loading…" : `${items.length} tracked`} · save jobs from your
        matches, then move them across the pipeline.
      </p>

      {!loading && items.length === 0 && (
        <p className="mt-4 text-sm text-neutral-500">
          No applications tracked yet. Use “Save to tracker” on a match.
        </p>
      )}

      {items.length > 0 && (
        <div className="mt-4 grid gap-3 overflow-x-auto sm:grid-cols-2 lg:grid-cols-3">
          {STATUSES.map((status) => {
            const cards = items.filter((a) => a.status === status);
            return (
              <div
                key={status}
                className="rounded-xl border border-black/5 bg-black/[0.02] p-3 dark:border-white/5 dark:bg-white/[0.02]"
              >
                <h3 className="mb-2 flex items-center justify-between text-sm font-medium">
                  {STATUS_LABELS[status]}
                  <span className="text-xs text-neutral-400">{cards.length}</span>
                </h3>
                <ul className="space-y-2">
                  {cards.map((app) => (
                    <li
                      key={app._id}
                      className="rounded-lg border border-black/10 bg-white p-3 dark:border-white/10 dark:bg-neutral-900"
                    >
                      {app.job ? (
                        <a
                          href={app.job.applyUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium hover:underline"
                        >
                          {app.job.title}
                        </a>
                      ) : (
                        <span className="text-sm font-medium text-neutral-400">
                          (job removed)
                        </span>
                      )}
                      {app.job && (
                        <p className="truncate text-xs text-neutral-500">
                          {[app.job.company, app.job.location || app.job.country]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      )}

                      <div className="mt-2 flex items-center gap-1.5">
                        <select
                          value={app.status}
                          onChange={(e) => changeStatus(app, e.target.value as Status)}
                          className="flex-1 rounded-md border border-black/15 px-1.5 py-1 text-xs dark:border-white/20 dark:bg-neutral-800"
                        >
                          {STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {STATUS_LABELS[s]}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => remove(app)}
                          aria-label="Remove from tracker"
                          className="rounded-md border border-black/15 px-2 py-1 text-xs text-neutral-500 hover:text-red-600 dark:border-white/20"
                        >
                          ✕
                        </button>
                      </div>

                      <textarea
                        defaultValue={app.notes ?? ""}
                        onBlur={(e) => void saveNotes(app, e.target.value)}
                        rows={2}
                        placeholder="Notes…"
                        className="mt-2 w-full rounded-md border border-black/10 p-1.5 text-xs dark:border-white/10 dark:bg-neutral-800"
                      />
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
