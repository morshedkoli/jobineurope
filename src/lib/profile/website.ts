import "server-only";
import { ObjectId } from "mongodb";
import { chatProvider } from "@/lib/ai";
import { getCollection } from "@/lib/db/mongo";
import { stripHtml } from "@/lib/jobs/types";
import type { ProfileDoc } from "@/lib/db/schema";

/**
 * Personal-website enrichment: fetch the page, strip to text, and ask the LLM
 * for a short professional summary that feeds matching and cover letters.
 */

const FETCH_TIMEOUT_MS = 10_000;
const MAX_TEXT_CHARS = 12_000;

export class InvalidWebsiteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidWebsiteError";
  }
}

/** Validate + normalize a user-supplied URL; only http(s) is allowed (SSRF guard). */
function normalizeUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new InvalidWebsiteError("That doesn't look like a valid URL.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new InvalidWebsiteError("Only http(s) URLs are supported.");
  }
  if (isPrivateHost(url.hostname)) {
    throw new InvalidWebsiteError("That host isn't allowed.");
  }
  return url;
}

/** Block obvious SSRF targets: localhost + private/link-local literal IPs. */
function isPrivateHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) {
    return true;
  }
  // IPv6 loopback / unique-local / link-local.
  if (host === "::1" || host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe80")) {
    return true;
  }
  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!ipv4) return false;
  const [a, b] = ipv4.slice(1).map(Number);
  return (
    a === 0 ||
    a === 127 || // loopback
    a === 10 || // private
    (a === 172 && b >= 16 && b <= 31) || // private
    (a === 192 && b === 168) || // private
    (a === 169 && b === 254) // link-local (cloud metadata)
  );
}

async function fetchPageText(url: URL): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "jobineurope", Accept: "text/html,*/*" },
      redirect: "follow",
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) {
      throw new InvalidWebsiteError(`Could not load the page (HTTP ${res.status}).`);
    }
    const html = await res.text();
    return stripHtml(html).slice(0, MAX_TEXT_CHARS);
  } catch (err) {
    if (err instanceof InvalidWebsiteError) throw err;
    throw new InvalidWebsiteError("Could not reach that website.");
  } finally {
    clearTimeout(timer);
  }
}

const SYSTEM_PROMPT = `You summarize a candidate's personal/portfolio website for
a job-matching system. Given the page text, write a concise professional summary
(max 120 words): who they are, their core skills, notable projects, and focus areas.
Plain prose, no preamble, no markdown headings.`;

async function summarize(text: string): Promise<string> {
  const summary = await chatProvider().chat(
    [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `WEBSITE TEXT:\n\n${text}` },
    ],
    { temperature: 0.2, maxTokens: 400 },
  );
  return summary.trim();
}

/** Fetch + summarize a website and persist it to `profile.website`. */
export async function enrichWebsite(
  userIdStr: string,
  rawUrl: string,
): Promise<NonNullable<ProfileDoc["website"]>> {
  const url = normalizeUrl(rawUrl);
  const text = await fetchPageText(url);
  if (text.length < 50) {
    throw new InvalidWebsiteError("That page has too little readable text to summarize.");
  }

  const summary = await summarize(text);
  const website: NonNullable<ProfileDoc["website"]> = { url: url.toString(), summary };

  const userId = new ObjectId(userIdStr);
  const profiles = await getCollection<ProfileDoc>("profile");
  await profiles.updateOne(
    { userId },
    { $set: { website, updatedAt: new Date() }, $setOnInsert: { userId } },
    { upsert: true },
  );

  return website;
}
