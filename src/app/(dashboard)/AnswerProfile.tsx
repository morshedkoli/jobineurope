"use client";

import { useCallback, useEffect, useState } from "react";

interface AnswerField {
  key: string;
  label: string;
  hint: string;
}

export function AnswerProfile() {
  const [schema, setSchema] = useState<AnswerField[]>([]);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<"idle" | "loading" | "drafting" | "saving">("loading");
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    setBusy("loading");
    const res = await fetch("/api/answers");
    const data = await res.json();
    setSchema(data.schema ?? []);
    setFields(data.fields ?? {});
    setBusy("idle");
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function draft() {
    setBusy("drafting");
    setError(null);
    try {
      const res = await fetch("/api/answers", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Drafting failed");
      // Merge: only overwrite fields the model returned, keep manual edits otherwise.
      setFields((prev) => ({ ...prev, ...data.fields }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Drafting failed");
    } finally {
      setBusy("idle");
    }
  }

  async function save() {
    setBusy("saving");
    setError(null);
    try {
      const res = await fetch("/api/answers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      setFields(data.fields ?? {});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy("idle");
    }
  }

  async function copy(key: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 1500);
    } catch {
      // Clipboard may be unavailable (insecure context); ignore silently.
    }
  }

  const drafting = busy === "drafting";
  const saving = busy === "saving";

  return (
    <section className="mt-6 rounded-2xl border border-black/10 bg-white p-6 dark:border-white/10 dark:bg-neutral-900">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Assisted apply</h2>
          <p className="text-sm text-neutral-500">
            Reusable answers for application forms. Draft from your profile, edit,
            then copy into each form — you review and submit.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={draft}
            disabled={drafting}
            className="rounded-lg bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900"
          >
            {drafting ? "Drafting…" : "Draft from my profile"}
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="rounded-lg border border-black/15 px-3 py-1.5 text-sm font-medium disabled:opacity-50 dark:border-white/20"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-4 space-y-4">
        {schema.map((field) => (
          <div key={field.key}>
            <div className="flex items-center justify-between gap-2">
              <label className="text-sm font-medium" htmlFor={`answer-${field.key}`}>
                {field.label}
              </label>
              <button
                onClick={() => copy(field.key, fields[field.key] ?? "")}
                disabled={!fields[field.key]}
                className="text-xs text-neutral-500 hover:underline disabled:opacity-40"
              >
                {copiedKey === field.key ? "Copied ✓" : "Copy"}
              </button>
            </div>
            <textarea
              id={`answer-${field.key}`}
              value={fields[field.key] ?? ""}
              onChange={(e) =>
                setFields((prev) => ({ ...prev, [field.key]: e.target.value }))
              }
              rows={2}
              placeholder={field.hint}
              className="mt-1 w-full rounded-lg border border-black/15 p-2 text-sm dark:border-white/20 dark:bg-neutral-800"
            />
          </div>
        ))}
      </div>
    </section>
  );
}
