"use client";

import { useState } from "react";
import type { UserSettings } from "@/lib/settings/store";
import type { Connector, ConnectorState } from "@/lib/connectors/status";
import { ApiKeyManager } from "@/app/(dashboard)/_components/ApiKeyManager";
import { StatusBadge, StatusDot } from "@/components/glass";

type Tab = "preferences" | "apikeys" | "services";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "preferences", label: "Preferences", icon: "◈" },
  { id: "apikeys", label: "API Keys & AI", icon: "⌁" },
  { id: "services", label: "Services", icon: "◎" },
];

const COUNTRY_OPTIONS = [
  { code: "DE", name: "Germany", flag: "🇩🇪" },
  { code: "RO", name: "Romania", flag: "🇷🇴" },
  { code: "NL", name: "Netherlands", flag: "🇳🇱" },
  { code: "IE", name: "Ireland", flag: "🇮🇪" },
  { code: "PL", name: "Poland", flag: "🇵🇱" },
  { code: "ES", name: "Spain", flag: "🇪🇸" },
  { code: "PT", name: "Portugal", flag: "🇵🇹" },
  { code: "SE", name: "Sweden", flag: "🇸🇪" },
  { code: "AT", name: "Austria", flag: "🇦🇹" },
  { code: "DK", name: "Denmark", flag: "🇩🇰" },
];

const STATE_META: Record<ConnectorState, { label: string; tone: "ok" | "warn" | "bad" | "idle" }> = {
  connected: { label: "Connected", tone: "ok" },
  configured: { label: "Configured", tone: "ok" },
  available: { label: "Available", tone: "warn" },
  missing: { label: "Not set", tone: "bad" },
};

interface Props {
  initial: UserSettings;
  connectors: Connector[];
  defaultTab?: Tab;
}

export function SettingsPanel({ initial, connectors, defaultTab = "preferences" }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>(defaultTab);

  return (
    <div>
      {/* Segmented tab bar */}
      <div className="mb-8 overflow-x-auto">
        <div className="tab-bar inline-flex min-w-max">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              aria-selected={activeTab === t.id}
              className="tab-btn"
            >
              <span className="mr-1.5 opacity-60">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "preferences" && <PreferencesTab initial={initial} />}
      {activeTab === "apikeys" && <ApiKeyManager />}
      {activeTab === "services" && (
        <ServicesTab connectors={connectors} onSwitchToKeys={() => setActiveTab("apikeys")} />
      )}
    </div>
  );
}

/* ── Preferences tab ──────────────────────────────────────────────────── */

function PreferencesTab({ initial }: { initial: UserSettings }) {
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
      setTimeout(() => setStatus((s) => (s === "saved" ? "idle" : s)), 2000);
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 2500);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Target countries */}
      <div className="glass p-6">
        <div className="mb-4">
          <h2 className="font-semibold">Target countries</h2>
          <p className="mt-0.5 text-sm text-muted">
            Limits job matching and scoring to your selected markets.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {COUNTRY_OPTIONS.map((c) => {
            const active = settings.targetCountries.includes(c.code);
            return (
              <button
                key={c.code}
                type="button"
                onClick={() => toggleCountry(c.code)}
                aria-pressed={active}
                className={[
                  "flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-sm font-medium transition-all",
                  active
                    ? "border-[var(--accent)]/40 bg-[var(--accent)]/15 text-[var(--accent)] shadow-[0_4px_14px_-4px_var(--accent)]"
                    : "border-[var(--glass-border)] bg-[var(--glass-bg-soft)] text-muted hover:text-[var(--fg)]",
                ].join(" ")}
              >
                <span>{c.flag}</span>
                {c.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Job preferences */}
      <div className="glass p-6">
        <div className="mb-4">
          <h2 className="font-semibold">Job preferences</h2>
          <p className="mt-0.5 text-sm text-muted">
            These preferences affect how jobs are filtered and scored.
          </p>
        </div>
        <div className="space-y-3">
          <Toggle
            label="English-speaking roles only"
            description="Prefer roles where English is the working language."
            checked={settings.englishOnly}
            onChange={(v) => setSettings((p) => ({ ...p, englishOnly: v }))}
          />
          <Toggle
            label="I need visa sponsorship"
            description="Caps fit scores for roles unlikely to sponsor relocation from outside the EU."
            checked={settings.needsVisaSponsorship}
            onChange={(v) => setSettings((p) => ({ ...p, needsVisaSponsorship: v }))}
          />
        </div>
      </div>

      {/* Save row */}
      <div className="flex items-center gap-3 pb-2">
        <button
          onClick={save}
          disabled={status === "saving"}
          className="glass-btn glass-btn-primary"
        >
          {status === "saving" ? "Saving…" : "Save preferences"}
        </button>
        {status === "saved" && (
          <span className="text-sm font-medium text-emerald-500">Saved ✓</span>
        )}
        {status === "error" && (
          <span className="text-sm font-medium text-red-500">Save failed — try again</span>
        )}
      </div>
    </div>
  );
}

interface ToggleProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
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
          "relative h-6 w-11 shrink-0 rounded-full transition-colors",
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

/* ── Services tab ─────────────────────────────────────────────────────── */

const CATEGORIES = ["Identity", "Job sources", "Data & AI"] as const;

function ServicesTab({
  connectors,
  onSwitchToKeys,
}: {
  connectors: Connector[];
  onSwitchToKeys: () => void;
}) {
  const configured = connectors.filter(
    (c) => c.state === "connected" || c.state === "configured",
  ).length;
  const total = connectors.length;

  return (
    <div className="space-y-8">
      {/* Summary row */}
      <div className="glass flex items-center justify-between gap-4 p-4">
        <div className="flex items-center gap-3">
          <StatusDot tone={configured === total ? "ok" : configured > 0 ? "warn" : "bad"} />
          <div>
            <p className="text-sm font-medium">
              {configured} of {total} services configured
            </p>
            <p className="text-xs text-muted">
              Missing keys can be added on the API Keys tab.
            </p>
          </div>
        </div>
        <button onClick={onSwitchToKeys} className="glass-btn text-xs">
          Manage keys →
        </button>
      </div>

      {CATEGORIES.map((cat) => {
        const items = connectors.filter((c) => c.category === cat);
        if (!items.length) return null;
        return (
          <section key={cat}>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-faint">
              {cat}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((c) => {
                const meta = STATE_META[c.state];
                return (
                  <div
                    key={c.id}
                    className="glass-soft flex flex-col gap-2 rounded-2xl p-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold">{c.name}</p>
                      <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>
                    </div>
                    <p className="text-xs text-muted leading-relaxed">{c.description}</p>
                    <p className="mt-auto text-xs text-faint">{c.detail}</p>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
