import type { ChatMessage, ChatOptions, ChatProvider, EmbedProvider } from "../types";

/**
 * Cloudflare Workers AI uses a per-model REST endpoint rather than the
 * OpenAI protocol, so it gets its own client.
 * https://developers.cloudflare.com/workers-ai/
 */
interface CloudflareConfig {
  accountId: string;
  apiToken: string;
  chatModel?: string; // e.g. @cf/meta/llama-3.1-8b-instruct
  embedModel?: string; // e.g. @cf/baai/bge-base-en-v1.5
  embedDimensions?: number;
}

function endpoint(accountId: string, model: string): string {
  return `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;
}

export class CloudflareChat implements ChatProvider {
  readonly name = "cloudflare";
  private cfg: CloudflareConfig;

  constructor(cfg: CloudflareConfig) {
    this.cfg = cfg;
  }

  async chat(messages: ChatMessage[], opts: ChatOptions = {}): Promise<string> {
    if (!this.cfg.chatModel) throw new Error("cloudflare: no chat model configured");
    const res = await fetch(endpoint(this.cfg.accountId, this.cfg.chatModel), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.cfg.apiToken}`,
      },
      body: JSON.stringify({
        messages,
        temperature: opts.temperature ?? 0.4,
        max_tokens: opts.maxTokens ?? 1500,
      }),
    });
    if (!res.ok) {
      throw new Error(`cloudflare chat failed (${res.status}): ${await res.text()}`);
    }
    const data = await res.json();
    const content = data?.result?.response;
    if (typeof content !== "string") {
      throw new Error("cloudflare chat: unexpected response shape");
    }
    return content;
  }
}

export class CloudflareEmbed implements EmbedProvider {
  readonly name = "cloudflare";
  readonly dimensions: number;
  private cfg: CloudflareConfig;

  constructor(cfg: CloudflareConfig) {
    this.cfg = cfg;
    this.dimensions = cfg.embedDimensions ?? 768; // bge-base-en-v1.5
  }

  async embed(texts: string[]): Promise<number[][]> {
    if (!this.cfg.embedModel) throw new Error("cloudflare: no embed model configured");
    const res = await fetch(endpoint(this.cfg.accountId, this.cfg.embedModel), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.cfg.apiToken}`,
      },
      body: JSON.stringify({ text: texts }),
    });
    if (!res.ok) {
      throw new Error(`cloudflare embed failed (${res.status}): ${await res.text()}`);
    }
    const data = await res.json();
    const vectors = data?.result?.data;
    if (!Array.isArray(vectors)) {
      throw new Error("cloudflare embed: unexpected response shape");
    }
    return vectors as number[][];
  }
}
