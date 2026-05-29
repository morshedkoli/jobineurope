"use client";

import { useCallback, useEffect, useState } from "react";

const TONES = ["professional", "enthusiastic", "concise", "formal"] as const;
type Tone = (typeof TONES)[number];

interface CoverLetterVersion {
  _id: string;
  version: number;
  body: string;
  tone?: string;
  createdAt: string;
}

interface CoverLetterProps {
  jobId: string;
}

export function CoverLetter({ jobId }: CoverLetterProps) {
  const [open, setOpen] = useState(false);
  const [versions, setVersions] = useState<CoverLetterVersion[]>([]);
  const [draft, setDraft] = useState("");
  const [tone, setTone] = useState<Tone>("professional");
  const [busy, setBusy] = useState<"idle" | "generating" | "saving" | "loading">("idle");
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    setBusy("loading");
    try {
      const res = await fetch(`/api/cover?jobId=${jobId}`);
      const data = await res.json();
      const items: CoverLetterVersion[] = data.items ?? [];
      setVersions(items);
      if (items[0]) {
        setDraft(items[0].body);
        if (items[0].tone) setTone(items[0].tone as Tone);
      }
    } finally {
      setBusy("idle");
      setLoaded(true);
    }
  }, [jobId]);

  useEffect(() => {
    if (open && !loaded) void load();
  }, [open, loaded, load]);

  async function generate() {
    setBusy("generating");
    setError(null);
    try {
      const res = await fetch("/api/cover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, tone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Generation failed");
      setVersions((prev) => [data.coverLetter, ...prev]);
      setDraft(data.coverLetter.body);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setBusy("idle");
    }
  }

  async function save() {
    setBusy("saving");
    setError(null);
    try {
      const res = await fetch("/api/cover", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, body: draft, tone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      setVersions((prev) => [data.coverLetter, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy("idle");
    }
  }

  const generating = busy === "generating";
  const saving = busy === "saving";

  return (
    <div className="mt-3 border-t border-black/5 pt-3 dark:border-white/5">
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-sm font-medium text-neutral-600 hover:underline dark:text-neutral-300"
      >
        {open ? "Hide cover letter" : "Cover letter"}
        {versions.length > 0 && !open ? ` (${versions.length})` : ""}
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value as Tone)}
              className="rounded-lg border border-black/15 px-2 py-1.5 text-sm dark:border-white/20 dark:bg-neutral-800"
            >
              {TONES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <button
              onClick={generate}
              disabled={generating}
              className="rounded-lg bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900"
            >
              {generating ? "Writing…" : versions.length > 0 ? "Regenerate" : "Generate"}
            </button>
            {draft && (
              <button
                onClick={save}
                disabled={saving}
                className="rounded-lg border border-black/15 px-3 py-1.5 text-sm font-medium disabled:opacity-50 dark:border-white/20"
              >
                {saving ? "Saving…" : "Save edits"}
              </button>
            )}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          {(draft || busy === "loading") && (
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={12}
              placeholder={busy === "loading" ? "Loading…" : "Your cover letter will appear here."}
              className="w-full rounded-lg border border-black/15 p-3 text-sm leading-relaxed dark:border-white/20 dark:bg-neutral-800"
            />
          )}

          {versions.length > 1 && (
            <details className="text-xs text-neutral-500">
              <summary className="cursor-pointer">Earlier versions ({versions.length - 1})</summary>
              <ul className="mt-2 space-y-1">
                {versions.slice(1).map((v) => (
                  <li key={v._id}>
                    <button
                      onClick={() => setDraft(v.body)}
                      className="hover:underline"
                    >
                      v{v.version}
                      {v.tone ? ` · ${v.tone}` : ""} · {new Date(v.createdAt).toLocaleDateString()}
                    </button>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
