/**
 * Registry of AI providers that work with ONLY an API key and speak the
 * OpenAI-compatible protocol (POST {baseUrl}/chat/completions and/or
 * {baseUrl}/embeddings). Adding a provider = one entry here.
 *
 * Model defaults can be overridden per provider via env:
 *   {ID}_CHAT_MODEL  and  {ID}_EMBED_MODEL   (ID uppercased, e.g. GROQ_CHAT_MODEL)
 *
 * Cloudflare Workers AI is NOT here — it needs an account ID + a custom
 * endpoint shape, so it stays a special case in index.ts.
 */

export type ProviderId =
  | "openrouter"
  | "nim"
  | "groq"
  | "together"
  | "fireworks"
  | "deepinfra"
  | "mistral"
  | "openai"
  | "gemini"
  | "deepseek"
  | "xai"
  | "cerebras"
  | "perplexity"
  | "voyage";

export interface ProviderSpec {
  id: ProviderId;
  label: string;
  baseUrl: string;
  apiKeyEnv: string;
  /** Default chat model; omit if the provider has no chat API. */
  chatModel?: string;
  /** Default embedding model; omit if the provider has no embeddings API. */
  embedModel?: string;
  /** Native output dimensions of the default embed model (for the Atlas index). */
  embedDimensions?: number;
  /** OpenRouter wants HTTP-Referer / X-Title attribution headers. */
  needsReferer?: boolean;
}

export const PROVIDERS: Record<ProviderId, ProviderSpec> = {
  openrouter: {
    id: "openrouter",
    label: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    apiKeyEnv: "OPENROUTER_API_KEY",
    chatModel: "meta-llama/llama-3.3-70b-instruct",
    needsReferer: true,
  },
  nim: {
    id: "nim",
    label: "NVIDIA NIM",
    baseUrl: "https://integrate.api.nvidia.com/v1",
    apiKeyEnv: "NVIDIA_NIM_API_KEY",
    chatModel: "meta/llama-3.3-70b-instruct",
    embedModel: "nvidia/nv-embedqa-e5-v5",
    embedDimensions: 1024,
  },
  groq: {
    id: "groq",
    label: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    apiKeyEnv: "GROQ_API_KEY",
    chatModel: "llama-3.3-70b-versatile",
  },
  together: {
    id: "together",
    label: "Together AI",
    baseUrl: "https://api.together.xyz/v1",
    apiKeyEnv: "TOGETHER_API_KEY",
    chatModel: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
    embedModel: "BAAI/bge-base-en-v1.5",
    embedDimensions: 768,
  },
  fireworks: {
    id: "fireworks",
    label: "Fireworks AI",
    baseUrl: "https://api.fireworks.ai/inference/v1",
    apiKeyEnv: "FIREWORKS_API_KEY",
    chatModel: "accounts/fireworks/models/llama-v3p3-70b-instruct",
    embedModel: "nomic-ai/nomic-embed-text-v1.5",
    embedDimensions: 768,
  },
  deepinfra: {
    id: "deepinfra",
    label: "DeepInfra",
    baseUrl: "https://api.deepinfra.com/v1/openai",
    apiKeyEnv: "DEEPINFRA_API_KEY",
    chatModel: "meta-llama/Llama-3.3-70B-Instruct",
    embedModel: "BAAI/bge-m3",
    embedDimensions: 1024,
  },
  mistral: {
    id: "mistral",
    label: "Mistral AI",
    baseUrl: "https://api.mistral.ai/v1",
    apiKeyEnv: "MISTRAL_API_KEY",
    chatModel: "mistral-large-latest",
    embedModel: "mistral-embed",
    embedDimensions: 1024,
  },
  openai: {
    id: "openai",
    label: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    apiKeyEnv: "OPENAI_API_KEY",
    chatModel: "gpt-4o-mini",
    embedModel: "text-embedding-3-small",
    embedDimensions: 1536,
  },
  gemini: {
    id: "gemini",
    label: "Google Gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    apiKeyEnv: "GEMINI_API_KEY",
    chatModel: "gemini-2.0-flash",
    embedModel: "text-embedding-004",
    embedDimensions: 768,
  },
  deepseek: {
    id: "deepseek",
    label: "DeepSeek",
    baseUrl: "https://api.deepseek.com/v1",
    apiKeyEnv: "DEEPSEEK_API_KEY",
    chatModel: "deepseek-chat",
  },
  xai: {
    id: "xai",
    label: "xAI Grok",
    baseUrl: "https://api.x.ai/v1",
    apiKeyEnv: "XAI_API_KEY",
    chatModel: "grok-2-latest",
  },
  cerebras: {
    id: "cerebras",
    label: "Cerebras",
    baseUrl: "https://api.cerebras.ai/v1",
    apiKeyEnv: "CEREBRAS_API_KEY",
    chatModel: "llama-3.3-70b",
  },
  perplexity: {
    id: "perplexity",
    label: "Perplexity",
    baseUrl: "https://api.perplexity.ai",
    apiKeyEnv: "PERPLEXITY_API_KEY",
    chatModel: "llama-3.1-sonar-large-128k-online",
  },
  voyage: {
    id: "voyage",
    label: "Voyage AI",
    baseUrl: "https://api.voyageai.com/v1",
    apiKeyEnv: "VOYAGE_API_KEY",
    embedModel: "voyage-3",
    embedDimensions: 1024,
  },
};

export function isProviderId(value: string): value is ProviderId {
  return value in PROVIDERS;
}
