"use client";

import { useState } from "react";
import type { ProfileDoc } from "@/lib/db/schema";

type Github = NonNullable<ProfileDoc["github"]>;
type Website = NonNullable<ProfileDoc["website"]>;

interface EnrichPanelProps {
  initialGithub: Github | null;
  initialWebsite: Website | null;
}

export function EnrichPanel({ initialGithub, initialWebsite }: EnrichPanelProps) {
  const [github, setGithub] = useState<Github | null>(initialGithub);
  const [website, setWebsite] = useState<Website | null>(initialWebsite);
  const [url, setUrl] = useState(initialWebsite?.url ?? "");
  const [ghBusy, setGhBusy] = useState(false);
  const [webBusy, setWebBusy] = useState(false);
  const [ghError, setGhError] = useState<string | null>(null);
  const [webError, setWebError] = useState<string | null>(null);

  async function syncGithub() {
    setGhBusy(true);
    setGhError(null);
    try {
      const res = await fetch("/api/profile/github", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "GitHub sync failed");
      setGithub(data.github);
    } catch (err) {
      setGhError(err instanceof Error ? err.message : "GitHub sync failed");
    } finally {
      setGhBusy(false);
    }
  }

  async function saveWebsite(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setWebBusy(true);
    setWebError(null);
    try {
      const res = await fetch("/api/profile/website", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Website summary failed");
      setWebsite(data.website);
    } catch (err) {
      setWebError(err instanceof Error ? err.message : "Website summary failed");
    } finally {
      setWebBusy(false);
    }
  }

  return (
    <section className="glass mt-6 p-6">
      <h2 className="text-lg font-semibold">Enrich your profile</h2>
      <p className="mt-1 text-sm text-muted">
        Pull in your GitHub activity and personal website so matching and cover
        letters reflect more than your CV.
      </p>

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        {/* GitHub */}
        <div className="glass-soft p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-medium">GitHub</h3>
            <button onClick={syncGithub} disabled={ghBusy} className="glass-btn">
              {ghBusy ? "Syncing…" : github ? "Re-sync" : "Connect"}
            </button>
          </div>

          {ghError && <p className="mt-2 text-sm text-red-600">{ghError}</p>}

          {github ? (
            <div className="mt-3 space-y-3">
              <p className="text-sm text-muted">
                @{github.username} · {github.repos.length} top repos
              </p>
              {github.topLanguages.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {github.topLanguages.slice(0, 8).map((lang) => (
                    <span key={lang} className="glass-chip">
                      {lang}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted">
              If you signed in with GitHub, hit Connect to import your languages
              and top repositories.
            </p>
          )}
        </div>

        {/* Website */}
        <div className="glass-soft p-4">
          <h3 className="font-medium">Personal website</h3>
          <form onSubmit={saveWebsite} className="mt-3 flex gap-2">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://you.dev"
              required
              className="glass-input min-w-0 flex-1"
            />
            <button type="submit" disabled={webBusy} className="glass-btn shrink-0">
              {webBusy ? "Reading…" : "Summarize"}
            </button>
          </form>

          {webError && <p className="mt-2 text-sm text-red-600">{webError}</p>}

          {website?.summary && (
            <p className="mt-3 text-sm text-muted">{website.summary}</p>
          )}
        </div>
      </div>
    </section>
  );
}
