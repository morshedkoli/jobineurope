"use client";

import { useState } from "react";
import type { UserSettings } from "@/lib/settings/store";

const COUNTRY_OPTIONS: Array<{ code: string; name: string }> = [
  { code: "DE", name: "Germany" },
  { code: "RO", name: "Romania" },
  { code: "NL", name: "Netherlands" },
  { code: "IE", name: "Ireland" },
  { code: "PL", name: "Poland" },
  { code: "ES", name: "Spain" },
  { code: "PT", name: "Portugal" },
  { code: "SE", name: "Sweden" },
  { code: "AT", name: "Austria" },
  { code: "DK", name: "Denmark" },
];

export function SettingsForm({ initial }: { initial: UserSettings }) {
  const [settings, setSettings] = useState<UserSettings>(initial);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  function toggleCountry(code: string) {
    setSettings((prev) => {
      const has = prev.targetCountries.includes(code);
      return {
        ...prev,
        targetCountries: has
          ? prev.targetCountries.filter((c) => c !== code)
          : [...prev.targetCountries, code],
      };
    });
  }

  async function save() {
    setStatus("saving");
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error("Save failed");
      const data = await res.json();
      setSettings(data.settings);
      setStatus("saved");
      setTimeout(() => setStatus((s) => (s === "saved" ? "idle" : s)), 1800);
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="space-y-6">
      <div className="glass p-6">
        <h2 className="text-lg font-semibold">Target countries</h2>
        <p className="mt-1 text-sm text-muted">
          Where you want to work. Used to weight matches and filter job sources.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {COUNTRY_OPTIONS.map((c) => {
            const active = settings.targetCountries.includes(c.code);
            return (
              <button
                key={c.code}
                type="button"
                onClick={() => toggleCountry(c.code)}
                aria-pressed={active}
                className={[
                  "rounded-full px-3.5 py-1.5 text-sm font-medium transition",
                  active
                    ? "bg-[var(--accent)] text-white shadow-[0_4px_14px_-4px_var(--accent)]"
                    : "glass-soft text-muted hover:text-[var(--fg)]",
                ].join(" ")}
              >
                {c.name}
              </button>
            );
          })}
        </div>
      </div>

      <div className="glass p-6">
        <h2 className="text-lg font-semibold">Preferences</h2>
        <div className="mt-4 space-y-3">
          <Toggle
            label="English-speaking roles only"
            description="Prefer workplaces where English is the working language."
            checked={settings.englishOnly}
            onChange={(v) => setSettings((p) => ({ ...p, englishOnly: v }))}
          />
          <Toggle
            label="I need visa sponsorship"
            description="Cap fit scores for roles that clearly won't sponsor relocation."
            checked={settings.needsVisaSponsorship}
            onChange={(v) => setSettings((p) => ({ ...p, needsVisaSponsorship: v }))}
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={save} disabled={status === "saving"} className="glass-btn-primary glass-btn">
          {status === "saving" ? "Saving…" : "Save changes"}
        </button>
        {status === "saved" && <span className="text-sm text-emerald-500">Saved ✓</span>}
        {status === "error" && <span className="text-sm text-red-500">Save failed</span>}
      </div>
    </div>
  );
}

interface ToggleProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}

function Toggle({ label, description, checked, onChange }: ToggleProps) {
  return (
    <div className="glass-soft flex items-center justify-between gap-4 rounded-xl px-4 py-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={[
          "relative h-6 w-11 shrink-0 rounded-full transition",
          checked ? "bg-[var(--accent)]" : "bg-black/20 dark:bg-white/20",
        ].join(" ")}
      >
        <span
          className={[
            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
            checked ? "left-[22px]" : "left-0.5",
          ].join(" ")}
        />
      </button>
    </div>
  );
}
