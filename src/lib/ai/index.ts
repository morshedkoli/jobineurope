import "server-only";
import type { ChatProvider, EmbedProvider } from "./types";
import { OpenAICompatChat, OpenAICompatEmbed } from "./providers/openai-compatible";
import { CloudflareChat, CloudflareEmbed } from "./providers/cloudflare";
import { PROVIDERS, isProviderId, type ProviderId, type ProviderSpec } from "./registry";

export type { ChatMessage, ChatOptions } from "./types";
export { PROVIDERS, type ProviderId } from "./registry";

/**
 * Provider routing is env-driven so chat and embeddings can use different
 * backends and different models:
 *
 *   AI_CHAT_PROVIDER  = openrouter | nim | groq | together | fireworks |
 *                       deepinfra | mistral | openai | gemini | deepseek |
 *                       xai | cerebras | perplexity | cloudflare
 *   AI_EMBED_PROVIDER = nim | together | fireworks | deepinfra | mistral |
 *                       openai | gemini | voyage | cloudflare
 *
 * Every provider except Cloudflare needs ONLY an API key.
 */

function requireEnv(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`Missing env var: ${key}`);
  return v;
}

/** Per-provider model override, e.g. GROQ_CHAT_MODEL / OPENAI_EMBED_MODEL. */
function modelOverride(spec: ProviderSpec, kind: "CHAT" | "EMBED"): string | undefined {
  return process.env[`${spec.id.toUpperCase()}_${kind}_MODEL`];
}

function referHeaders(spec: ProviderSpec): Record<string, string> | undefined {
  if (!spec.needsReferer) return undefined;
  return {
    "HTTP-Referer": process.env.APP_URL ?? "http://localhost:3000",
    "X-Title": "jobineurope",
  };
}

function buildChatProvider(): ChatProvider {
  const id = process.env.AI_CHAT_PROVIDER ?? "openrouter";

  if (id === "cloudflare") {
    return new CloudflareChat({
      accountId: requireEnv("CLOUDFLARE_ACCOUNT_ID"),
      apiToken: requireEnv("CLOUDFLARE_API_TOKEN"),
      chatModel: process.env.CLOUDFLARE_CHAT_MODEL ?? "@cf/meta/llama-3.1-8b-instruct",
    });
  }

  if (!isProviderId(id)) throw new Error(`Unknown AI_CHAT_PROVIDER: ${id}`);
  const spec = PROVIDERS[id];
  const chatModel = modelOverride(spec, "CHAT") ?? spec.chatModel;
  if (!chatModel) throw new Error(`${spec.label} has no chat model`);

  return new OpenAICompatChat({
    name: spec.id,
    baseUrl: spec.baseUrl,
    apiKey: requireEnv(spec.apiKeyEnv),
    chatModel,
    extraHeaders: referHeaders(spec),
  });
}

function buildEmbedProvider(): EmbedProvider {
  const id = process.env.AI_EMBED_PROVIDER ?? "cloudflare";

  if (id === "cloudflare") {
    return new CloudflareEmbed({
      accountId: requireEnv("CLOUDFLARE_ACCOUNT_ID"),
      apiToken: requireEnv("CLOUDFLARE_API_TOKEN"),
      embedModel: process.env.CLOUDFLARE_EMBED_MODEL ?? "@cf/baai/bge-m3",
      embedDimensions: Number(process.env.EMBED_DIMENSIONS ?? 1024),
    });
  }

  if (!isProviderId(id)) throw new Error(`Unknown AI_EMBED_PROVIDER: ${id}`);
  const spec = PROVIDERS[id];
  const embedModel = modelOverride(spec, "EMBED") ?? spec.embedModel;
  if (!embedModel) throw new Error(`${spec.label} has no embeddings model`);

  return new OpenAICompatEmbed({
    name: spec.id,
    baseUrl: spec.baseUrl,
    apiKey: requireEnv(spec.apiKeyEnv),
    embedModel,
    // EMBED_DIMENSIONS (the Atlas index size) wins; fall back to the model's native dims.
    embedDimensions: Number(process.env.EMBED_DIMENSIONS ?? spec.embedDimensions ?? 1024),
    extraHeaders: referHeaders(spec),
  });
}

let _chat: ChatProvider | undefined;
let _embed: EmbedProvider | undefined;

export function chatProvider(): ChatProvider {
  return (_chat ??= buildChatProvider());
}

export function embedProvider(): EmbedProvider {
  return (_embed ??= buildEmbedProvider());
}

/** Providers whose API key is present in the environment, split by capability. */
export function availableProviders(): {
  chat: ProviderId[];
  embed: ProviderId[];
  cloudflare: boolean;
} {
  const ids = Object.values(PROVIDERS).filter((p) => Boolean(process.env[p.apiKeyEnv]));
  return {
    chat: ids.filter((p) => p.chatModel).map((p) => p.id),
    embed: ids.filter((p) => p.embedModel).map((p) => p.id),
    cloudflare: Boolean(process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_API_TOKEN),
  };
}

/**
 * Pull a JSON object out of a model response that may be wrapped in prose
 * or ```json fences. Throws if no parseable object is found.
 */
export function extractJson<T>(text: string): T {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("No JSON object found in model response");
  }
  return JSON.parse(candidate.slice(start, end + 1)) as T;
}
