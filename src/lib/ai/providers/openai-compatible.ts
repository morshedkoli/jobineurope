import type { ChatMessage, ChatOptions, ChatProvider, EmbedProvider } from "../types";

/**
 * Shared client for any OpenAI-compatible endpoint.
 * OpenRouter and NVIDIA NIM both speak this protocol, so they reuse this.
 */
interface OpenAICompatConfig {
  name: string;
  baseUrl: string; // e.g. https://openrouter.ai/api/v1
  apiKey: string;
  chatModel?: string;
  embedModel?: string;
  embedDimensions?: number;
  extraHeaders?: Record<string, string>;
}

export class OpenAICompatChat implements ChatProvider {
  readonly name: string;
  private cfg: OpenAICompatConfig;

  constructor(cfg: OpenAICompatConfig) {
    this.name = cfg.name;
    this.cfg = cfg;
  }

  async chat(messages: ChatMessage[], opts: ChatOptions = {}): Promise<string> {
    if (!this.cfg.chatModel) {
      throw new Error(`${this.name}: no chat model configured`);
    }
    const res = await fetch(`${this.cfg.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.cfg.apiKey}`,
        ...this.cfg.extraHeaders,
      },
      body: JSON.stringify({
        model: this.cfg.chatModel,
        messages,
        temperature: opts.temperature ?? 0.4,
        max_tokens: opts.maxTokens ?? 1500,
        ...(opts.json ? { response_format: { type: "json_object" } } : {}),
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`${this.name} chat failed (${res.status}): ${text}`);
    }
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== "string") {
      throw new Error(`${this.name} chat: unexpected response shape`);
    }
    return content;
  }
}

export class OpenAICompatEmbed implements EmbedProvider {
  readonly name: string;
  readonly dimensions: number;
  private cfg: OpenAICompatConfig;

  constructor(cfg: OpenAICompatConfig) {
    this.name = cfg.name;
    this.dimensions = cfg.embedDimensions ?? 1024;
    this.cfg = cfg;
  }

  async embed(texts: string[]): Promise<number[][]> {
    if (!this.cfg.embedModel) {
      throw new Error(`${this.name}: no embed model configured`);
    }
    const res = await fetch(`${this.cfg.baseUrl}/embeddings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.cfg.apiKey}`,
        ...this.cfg.extraHeaders,
      },
      body: JSON.stringify({ model: this.cfg.embedModel, input: texts }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`${this.name} embed failed (${res.status}): ${text}`);
    }
    const data = await res.json();
    const rows = data?.data;
    if (!Array.isArray(rows)) {
      throw new Error(`${this.name} embed: unexpected response shape`);
    }
    return rows.map((r: { embedding: number[] }) => r.embedding);
  }
}
