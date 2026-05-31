"use client";

import { useRef, useState } from "react";
import type { StructuredCv } from "@/lib/db/schema";

interface CvUploadProps {
  initialCv: StructuredCv | null;
}

export function CvUpload({ initialCv }: CvUploadProps) {
  const [cv, setCv] = useState<StructuredCv | null>(initialCv);
  const [status, setStatus] = useState<"idle" | "uploading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const file = inputRef.current?.files?.[0];
    if (!file) return;

    setStatus("uploading");
    setError(null);

    const body = new FormData();
    body.append("cv", file);

    try {
      const res = await fetch("/api/profile/cv", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setCv(data.structuredCv);
      setStatus("idle");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setStatus("error");
    }
  }

  const uploading = status === "uploading";

  return (
    <section className="glass p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">
            CV
            {cv && (
              <span className="ml-2 inline-flex items-center rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-300">
                ✓ parsed
              </span>
            )}
          </h2>
          <p className="mt-0.5 text-sm text-muted">
            PDF upload — we extract skills, experience, and sponsorship needs.
          </p>
        </div>

        {cv && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="glass-btn text-xs"
          >
            Replace CV
          </button>
        )}
      </div>

      {/* Drop zone / file picker (hidden when CV already parsed) */}
      {!cv && (
        <form onSubmit={onSubmit} className="mt-4">
          <label className="group flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-[var(--glass-border)] px-6 py-10 text-center transition hover:border-[var(--accent)]/50 hover:bg-[var(--accent)]/5">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-[var(--accent)]/15 text-2xl text-[var(--accent)]">
              ↑
            </span>
            <div>
              <p className="font-medium">
                {fileName ? fileName : "Drop your CV here or click to browse"}
              </p>
              <p className="mt-0.5 text-xs text-faint">PDF only · max 8 MB</p>
            </div>
            <input
              ref={inputRef}
              name="cv"
              type="file"
              accept="application/pdf"
              required
              className="sr-only"
              onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
            />
          </label>

          {fileName && (
            <button
              type="submit"
              disabled={uploading}
              className="glass-btn glass-btn-primary mt-3 w-full"
            >
              {uploading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Parsing CV…
                </span>
              ) : (
                "Upload & Parse →"
              )}
            </button>
          )}

          {error && (
            <p className="mt-3 rounded-xl bg-red-500/15 px-3 py-2 text-sm text-red-600 dark:text-red-300">
              {error}
            </p>
          )}
        </form>
      )}

      {/* Hidden replace form */}
      {cv && (
        <form onSubmit={onSubmit} className="hidden">
          <input
            ref={inputRef}
            name="cv"
            type="file"
            accept="application/pdf"
            onChange={(e) => {
              setFileName(e.target.files?.[0]?.name ?? null);
              e.currentTarget.form?.requestSubmit();
            }}
          />
        </form>
      )}

      {/* Parsed CV summary */}
      {cv && (
        <div className="mt-5 space-y-4">
          {uploading && (
            <p className="text-sm text-muted">Parsing new CV…</p>
          )}

          <div className="flex flex-wrap items-center gap-2.5">
            {cv.headline && (
              <p className="w-full text-base font-medium">{cv.headline}</p>
            )}
            {cv.yearsTotal != null && (
              <span className="glass-chip">{cv.yearsTotal} yrs experience</span>
            )}
            {cv.titles.slice(0, 2).map((t) => (
              <span key={t} className="glass-chip">{t}</span>
            ))}
            {cv.needsVisaSponsorship && (
              <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-300">
                Needs visa sponsorship
              </span>
            )}
          </div>

          {cv.skills.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-faint">
                Skills
              </p>
              <div className="flex flex-wrap gap-1.5">
                {cv.skills.slice(0, 24).map((s) => (
                  <span key={s} className="glass-chip">{s}</span>
                ))}
                {cv.skills.length > 24 && (
                  <span className="glass-chip text-faint">+{cv.skills.length - 24} more</span>
                )}
              </div>
            </div>
          )}

          {error && (
            <p className="rounded-xl bg-red-500/15 px-3 py-2 text-sm text-red-600 dark:text-red-300">
              {error}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
