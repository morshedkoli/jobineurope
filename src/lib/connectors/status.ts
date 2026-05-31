import "server-only";
import { ObjectId } from "mongodb";
import { getCollection, getDb } from "@/lib/db/mongo";
import { availableProviders } from "@/lib/ai";
import type { ProfileDoc } from "@/lib/db/schema";

export type ConnectorState = "connected" | "configured" | "available" | "missing";

export interface Connector {
  id: string;
  name: string;
  category: "Identity" | "Job sources" | "Data & AI";
  description: string;
  state: ConnectorState;
  detail: string;
}

/**
 * Computes the live status of every external integration the app can use.
 * Read-only: env presence + a couple of cheap DB reads. Secrets never leave
 * the server — only booleans and counts are returned.
 */
export async function getConnectors(userId: string): Promise<Connector[]> {
  const env = (k: string) => Boolean(process.env[k]);

  // Identity providers — "connected" if the user has actually linked the
  // account (an accounts doc exists), otherwise just "configured" if creds set.
  let linkedProviders = new Set<string>();
  try {
    const accounts = await (await getDb()).collection("accounts");
    const docs = await accounts
      .find({ userId: new ObjectId(userId) }, { projection: { provider: 1 } })
      .toArray();
    linkedProviders = new Set(docs.map((d) => d.provider as string));
  } catch {
    // accounts collection may not exist yet for a credentials-only user.
  }

  const profiles = await getCollection<ProfileDoc>("profile");
  const profile = await profiles.findOne(
    { userId: new ObjectId(userId) },
    { projection: { github: 1, website: 1 } },
  );

  const ai = availableProviders();
  const chatProvider = process.env.AI_CHAT_PROVIDER ?? "openrouter";
  const embedProvider = process.env.AI_EMBED_PROVIDER ?? "cloudflare";

  const identity = (provider: string, env1: string, env2: string): ConnectorState => {
    if (linkedProviders.has(provider)) return "connected";
    return env(env1) && env(env2) ? "configured" : "missing";
  };

  return [
    {
      id: "github",
      name: "GitHub",
      category: "Identity",
      description: "Sign-in + import your languages and top repositories.",
      state: profile?.github ? "connected" : identity("github", "AUTH_GITHUB_ID", "AUTH_GITHUB_SECRET"),
      detail: profile?.github
        ? `@${profile.github.username} · ${profile.github.repos.length} repos imported`
        : env("AUTH_GITHUB_ID")
          ? "OAuth app configured — sign in with GitHub to link."
          : "Set AUTH_GITHUB_ID / AUTH_GITHUB_SECRET.",
    },
    {
      id: "google",
      name: "Google",
      category: "Identity",
      description: "Sign-in with your Google account.",
      state: identity("google", "AUTH_GOOGLE_ID", "AUTH_GOOGLE_SECRET"),
      detail: linkedProviders.has("google")
        ? "Account linked."
        : env("AUTH_GOOGLE_ID")
          ? "OAuth app configured — sign in with Google to link."
          : "Set AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET.",
    },
    {
      id: "website",
      name: "Personal website",
      category: "Identity",
      description: "Summarize your portfolio site into your profile.",
      state: profile?.website ? "connected" : "available",
      detail: profile?.website?.url ? profile.website.url : "Add your site on the Profile page.",
    },
    {
      id: "arbeitnow",
      name: "Arbeitnow",
      category: "Job sources",
      description: "Free European job feed (no key required).",
      state: "connected",
      detail: "Always on — no credentials needed.",
    },
    {
      id: "adzuna",
      name: "Adzuna",
      category: "Job sources",
      description: "Aggregated listings across DE/RO and more.",
      state: env("ADZUNA_APP_ID") && env("ADZUNA_APP_KEY") ? "configured" : "missing",
      detail:
        env("ADZUNA_APP_ID") && env("ADZUNA_APP_KEY")
          ? "API credentials present."
          : "Set ADZUNA_APP_ID / ADZUNA_APP_KEY to enable.",
    },
    {
      id: "mongodb",
      name: "MongoDB",
      category: "Data & AI",
      description: "Primary datastore for profile, jobs, and applications.",
      state: env("MONGODB_URI") ? "connected" : "missing",
      detail: env("MONGODB_URI")
        ? `Database: ${process.env.MONGODB_DB ?? "jobineurope"}`
        : "Set MONGODB_URI in .env.local.",
    },
    {
      id: "ai-chat",
      name: `AI chat · ${chatProvider}`,
      category: "Data & AI",
      description: "Powers matching rationale, cover letters, and answers.",
      state:
        chatProvider === "cloudflare"
          ? ai.cloudflare
            ? "configured"
            : "missing"
          : ai.chat.includes(chatProvider as never)
            ? "configured"
            : "missing",
      detail: `${ai.chat.length} chat provider${ai.chat.length === 1 ? "" : "s"} have keys${ai.cloudflare ? " · Cloudflare ready" : ""}.`,
    },
    {
      id: "ai-embed",
      name: `AI embeddings · ${embedProvider}`,
      category: "Data & AI",
      description: "Vector embeddings for semantic job shortlisting.",
      state:
        embedProvider === "cloudflare"
          ? ai.cloudflare
            ? "configured"
            : "missing"
          : ai.embed.includes(embedProvider as never)
            ? "configured"
            : "missing",
      detail: `${ai.embed.length} embed provider${ai.embed.length === 1 ? "" : "s"} have keys.`,
    },
  ];
}
