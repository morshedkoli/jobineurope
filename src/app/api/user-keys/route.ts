import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getApiKey, setApiKey, deleteApiKey, listApiKeyNames } from "@/lib/db/user-keys";
import { PROVIDERS } from "@/lib/ai";

export const runtime = "nodejs";

const ALLOWED_KEY_NAMES = new Set<string>([
  "AI_CHAT_PROVIDER",
  "AI_EMBED_PROVIDER",
  "CLOUDFLARE_ACCOUNT_ID",
  "CLOUDFLARE_API_TOKEN",
  "ADZUNA_APP_ID",
  "ADZUNA_APP_KEY",
  ...Object.values(PROVIDERS).map((p) => p.apiKeyEnv),
]);

async function requireUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

/** Returns which key names have been saved (never the values). */
export async function GET() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const saved = await listApiKeyNames(userId);
  const keys: Record<string, boolean> = {};
  for (const name of [...ALLOWED_KEY_NAMES]) {
    keys[name] = saved.includes(name);
  }
  return NextResponse.json({ keys });
}

/** Save or update a single API key. Body: { keyName, value }. */
export async function PUT(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let payload: { keyName?: unknown; value?: unknown };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { keyName, value } = payload;
  if (typeof keyName !== "string" || !ALLOWED_KEY_NAMES.has(keyName)) {
    return NextResponse.json({ error: "Unknown key name." }, { status: 400 });
  }
  if (typeof value !== "string" || value.trim().length === 0) {
    return NextResponse.json({ error: "Value must be a non-empty string." }, { status: 400 });
  }

  await setApiKey(userId, keyName, value);
  return NextResponse.json({ ok: true, keyName, saved: true });
}

/** Remove a single API key. Query: ?keyName=X */
export async function DELETE(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const keyName = new URL(req.url).searchParams.get("keyName");
  if (!keyName || !ALLOWED_KEY_NAMES.has(keyName)) {
    return NextResponse.json({ error: "Unknown key name." }, { status: 400 });
  }

  await deleteApiKey(userId, keyName);
  return NextResponse.json({ ok: true, keyName, saved: false });
}

/** Test whether a stored or env key is present (does not reveal its value). */
export async function POST(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let payload: { keyName?: unknown };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { keyName } = payload;
  if (typeof keyName !== "string" || !ALLOWED_KEY_NAMES.has(keyName)) {
    return NextResponse.json({ error: "Unknown key name." }, { status: 400 });
  }

  const fromDb = await getApiKey(userId, keyName);
  const fromEnv = process.env[keyName];
  return NextResponse.json({
    keyName,
    source: fromDb ? "user" : fromEnv ? "env" : "none",
  });
}
