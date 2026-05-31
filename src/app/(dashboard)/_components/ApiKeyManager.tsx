"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface KeyGroup {
  label: string;
  description: string;
  keys: KeyDef[];
}

interface KeyDef {
  name: string;
  label: string;
  hint?: string;
  isSelect?: boolean;
  options?: Array<{ value: string; label: string }>;
}

const CHAT_PROVIDERS = [
  { value: "openrouter", label: "OpenRouter" },
  { value: "nim", label: "NVIDIA NIM" },
  { value: "groq", label: "Groq" },
  { value: "together", label: "Together AI" },
  { value: "fireworks", label: "Fireworks AI" },
  { value: "deepinfra", label: "DeepInfra" },
  { value: "mistral", label: "Mistral AI" },
  { value: "openai", label: "OpenAI" },
  { value: "gemini", label: "Google Gemini" },
  { value: "deepseek", label: "DeepSeek" },
  { value: "xai", label: "xAI Grok" },
  { value: "cerebras", label: "Cerebras" },
  { value: "perplexity", label: "Perplexity" },
  { value: "cloudflare", label: "Cloudflare Workers AI" },
];

const EMBED_PROVIDERS = [
  { value: "cloudflare", label: "Cloudflare Workers AI" },
  { value: "nim", label: "NVIDIA NIM" },
  { value: "together", label: "Together AI" },
  { value: "fireworks", label: "Fireworks AI" },
  { value: "deepinfra", label: "DeepInfra" },
  { value: "mistral", label: "Mistral AI" },
  { value: "openai", label: "OpenAI" },
  { value: "gemini", label: "Google Gemini" },
  { value: "voyage", label: "Voyage AI" },
];

const KEY_GROUPS: KeyGroup[] = [
  {
    label: "AI routing",
    description: "Which provider handles chat and embeddings. Your saved keys below are used when these providers are selected.",
    keys: [
      {
        name: "AI_CHAT_PROVIDER",
        label: "Chat provider",
        isSelect: true,
        options: CHAT_PROVIDERS,
      },
      {
        name: "AI_EMBED_PROVIDER",
        label: "Embeddings provider",
        isSelect: true,
        options: EMBED_PROVIDERS,
      },
    ],
  },
  {
    label: "Cloudflare Workers AI",
    description: "Free inference tier — good for both chat and embeddings.",
    keys: [
      { name: "CLOUDFLARE_ACCOUNT_ID", label: "Account ID", hint: "From dash.cloudflare.com → AI" },
      { name: "CLOUDFLARE_API_TOKEN", label: "API Token", hint: "Workers AI read+write permission" },
    ],
  },
  {
    label: "AI providers",
    description: "API keys for individual inference providers. Only the active provider's key is used.",
    keys: [
      { name: "OPENROUTER_API_KEY", label: "OpenRouter", hint: "openrouter.ai/keys" },
      { name: "NVIDIA_NIM_API_KEY", label: "NVIDIA NIM", hint: "build.nvidia.com" },
      { name: "GROQ_API_KEY", label: "Groq", hint: "console.groq.com/keys" },
      { name: "TOGETHER_API_KEY", label: "Together AI", hint: "api.together.ai/settings/api-keys" },
      { name: "FIREWORKS_API_KEY", label: "Fireworks AI", hint: "fireworks.ai/account/api-keys" },
      { name: "DEEPINFRA_API_KEY", label: "DeepInfra", hint: "deepinfra.com/dash/api_keys" },
      { name: "MISTRAL_API_KEY", label: "Mistral AI", hint: "console.mistral.ai/api-keys" },
      { name: "OPENAI_API_KEY", label: "OpenAI", hint: "platform.openai.com/api-keys" },
      { name: "GEMINI_API_KEY", label: "Google Gemini", hint: "aistudio.google.com/apikey" },
      { name: "DEEPSEEK_API_KEY", label: "DeepSeek", hint: "platform.deepseek.com/api_keys" },
      { name: "XAI_API_KEY", label: "xAI Grok", hint: "console.x.ai" },
      { name: "CEREBRAS_API_KEY", label: "Cerebras", hint: "cloud.cerebras.ai" },
      { name: "PERPLEXITY_API_KEY", label: "Perplexity", hint: "perplexity.ai/settings/api" },
      { name: "VOYAGE_API_KEY", label: "Voyage AI (embed only)", hint: "dashboard.voyageai.com" },
    ],
  },
  {
    label: "Job sources",
    description: "Adzuna fetches listings across Germany and Romania.",
    keys: [
      { name: "ADZUNA_APP_ID", label: "Adzuna App ID", hint: "developer.adzuna.com" },
      { name: "ADZUNA_APP_KEY", label: "Adzuna App Key", hint: "developer.adzuna.com" },
    ],
  },
];

type KeyState = Record<string, boolean>; // keyName → is saved
type ValueState = Record<string, string>; // keyName → current input value
type StatusState = Record<string, "idle" | "saving" | "deleting" | "saved" | "error">;

export function ApiKeyManager() {
  const [saved, setSaved] = useState<KeyState>({});
  const [values, setValues] = useState<ValueState>({});
  const [statuses, setStatuses] = useState<StatusState>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    return fetch("/api/user-keys")
      .then((r) => r.json())
      .then((data: { keys: KeyState }) => {
        setSaved(data.keys ?? {});
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function setStatus(keyName: string, status: StatusState[string]) {
    setStatuses((prev) => ({ ...prev, [keyName]: status }));
  }

  async function save(keyName: string, value: string) {
    if (!value.trim()) return;
    setStatus(keyName, "saving");
    try {
      const res = await fetch("/api/user-keys", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyName, value }),
      });
      if (!res.ok) throw new Error("Save failed");
      setSaved((prev) => ({ ...prev, [keyName]: true }));
      setValues((prev) => ({ ...prev, [keyName]: "" }));
      setStatus(keyName, "saved");
      setTimeout(() => setStatus(keyName, "idle"), 1800);
    } catch {
      setStatus(keyName, "error");
      setTimeout(() => setStatus(keyName, "idle"), 2500);
    }
  }

  async function remove(keyName: string) {
    setStatus(keyName, "deleting");
    try {
      const res = await fetch(`/api/user-keys?keyName=${encodeURIComponent(keyName)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
      setSaved((prev) => ({ ...prev, [keyName]: false }));
      setStatus(keyName, "idle");
    } catch {
      setStatus(keyName, "error");
      setTimeout(() => setStatus(keyName, "idle"), 2500);
    }
  }

  if (loading) {
    return (
      <div className="mt-8">
        <SectionHeading>Configure API Keys</SectionHeading>
        <p className="mt-2 text-sm text-muted">Loading…</p>
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-8">
      <div>
        <SectionHeading>Configure API Keys</SectionHeading>
        <p className="mt-1 text-sm text-muted">
          Keys are stored encrypted in the database and used instead of server environment
          variables. Env vars remain the fallback when no user key is saved.
        </p>
      </div>

      {KEY_GROUPS.map((group) => (
        <section key={group.label}>
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-faint">
            {group.label}
          </h2>
          <p className="mb-3 text-xs text-muted">{group.description}</p>
          <div className="glass divide-y divide-[var(--glass-border)]">
            {group.keys.map((kd) => (
              <KeyRow
                key={kd.name}
                def={kd}
                isSaved={saved[kd.name] ?? false}
                value={values[kd.name] ?? ""}
                status={statuses[kd.name] ?? "idle"}
                onChange={(v) => setValues((prev) => ({ ...prev, [kd.name]: v }))}
                onSave={() => save(kd.name, values[kd.name] ?? "")}
                onRemove={() => remove(kd.name)}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg font-semibold">{children}</h2>;
}

interface KeyRowProps {
  def: KeyDef;
  isSaved: boolean;
  value: string;
  status: StatusState[string];
  onChange: (v: string) => void;
  onSave: () => void;
  onRemove: () => void;
}

function KeyRow({ def, isSaved, value, status, onChange, onSave, onRemove }: KeyRowProps) {
  const inputRef = useRef<HTMLInputElement & HTMLSelectElement>(null);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") onSave();
  }

  const busy = status === "saving" || status === "deleting";

  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">
          {def.label}
          {isSaved && (
            <span className="ml-2 inline-flex items-center rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-300">
              ✓ saved
            </span>
          )}
        </p>
        {def.hint && <p className="text-xs text-faint">{def.hint}</p>}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {def.isSelect ? (
          <select
            ref={inputRef as React.RefObject<HTMLSelectElement>}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="glass-input !w-44 !py-1.5 text-sm"
          >
            <option value="">— env default —</option>
            {def.options?.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        ) : (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="password"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isSaved ? "••••••••  (replace)" : "Paste key…"}
            autoComplete="off"
            className="glass-input !w-52 !py-1.5 text-sm"
          />
        )}

        <button
          onClick={onSave}
          disabled={busy || !value}
          className="glass-btn glass-btn-primary !px-3 !py-1.5 text-xs"
        >
          {status === "saving" ? "Saving…" : status === "saved" ? "Saved ✓" : "Save"}
        </button>

        {isSaved && (
          <button
            onClick={onRemove}
            disabled={busy}
            className="glass-btn !px-3 !py-1.5 text-xs hover:text-red-600"
          >
            {status === "deleting" ? "…" : "Remove"}
          </button>
        )}

        {status === "error" && (
          <span className="text-xs text-red-500">Failed</span>
        )}
      </div>
    </div>
  );
}
