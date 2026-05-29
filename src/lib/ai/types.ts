export type ChatRole = "system" | "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  /** Request JSON-object output where the provider supports it. */
  json?: boolean;
}

export interface ChatProvider {
  readonly name: string;
  chat(messages: ChatMessage[], opts?: ChatOptions): Promise<string>;
}

export interface EmbedProvider {
  readonly name: string;
  /** Dimensionality of vectors this provider returns (for the Atlas index). */
  readonly dimensions: number;
  embed(texts: string[]): Promise<number[][]>;
}
