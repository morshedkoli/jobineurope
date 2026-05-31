"use client";

import { useState } from "react";
import type { StructuredCv } from "@/lib/db/schema";

interface CvUploadProps {
  initialCv: StructuredCv | null;
}

export function CvUpload({ initialCv }: CvUploadProps) {
  const [cv, setCv] = useState<StructuredCv | null>(initialCv);
  const [status, setStatus] = useState<"idle" | "uploading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const input = e.currentTarget.elements.namedItem("cv") as HTMLInputElement;
    const file = input.files?.[0];
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

  return (
    <section className="glass p-6">
      <h2 className="text-lg font-semibold">Your CV</h2>
      <p className="mt-1 text-sm text-muted">
        Upload a PDF. We extract your skills, experience, and sponsorship needs.
      </p>

      <form onSubmit={onSubmit} className="mt-4 flex items-center gap-3">
        <input
          name="cv"
          type="file"
          accept="application/pdf"
          required
          className="block text-sm text-muted file:mr-3 file:rounded-xl file:border-0 file:bg-gradient-to-b file:from-[var(--accent-2)] file:to-[var(--accent)] file:px-4 file:py-2 file:text-sm file:font-medium file:text-white"
        />
        <button type="submit" disabled={status === "uploading"} className="glass-btn glass-btn-primary">
          {status === "uploading" ? "Parsing…" : "Upload"}
        </button>
      </form>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {cv && (
        <div className="mt-6 space-y-4 border-t border-[var(--glass-border)] pt-4">
          {cv.headline && <p className="font-medium">{cv.headline}</p>}
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
            {cv.yearsTotal != null && <span>{cv.yearsTotal} yrs experience</span>}
            {cv.needsVisaSponsorship && (
              <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-300">
                Needs visa sponsorship
              </span>
            )}
          </div>
          {cv.skills.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {cv.skills.slice(0, 24).map((s) => (
                <span key={s} className="glass-chip">
                  {s}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
