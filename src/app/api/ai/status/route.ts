import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { availableProviders, PROVIDERS } from "@/lib/ai";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const available = availableProviders();
  return NextResponse.json({
    selected: {
      chat: process.env.AI_CHAT_PROVIDER ?? "openrouter",
      embed: process.env.AI_EMBED_PROVIDER ?? "cloudflare",
      embedDimensions: Number(process.env.EMBED_DIMENSIONS ?? 1024),
    },
    available, // { chat: [...], embed: [...], cloudflare: bool }
    known: Object.values(PROVIDERS).map((p) => ({
      id: p.id,
      label: p.label,
      chat: Boolean(p.chatModel),
      embed: Boolean(p.embedModel),
    })),
  });
}
