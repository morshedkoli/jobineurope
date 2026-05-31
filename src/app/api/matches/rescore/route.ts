import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { auth } from "@/auth";
import { rescoreMatches } from "@/lib/matching/rescore";
import { chatProviderForUser, embedProviderForUser } from "@/lib/ai";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  let visaOnly = false;
  try {
    const body = await req.json();
    visaOnly = Boolean(body?.visaOnly);
  } catch {
    // no body is fine
  }

  try {
    const [chat, embed] = await Promise.all([
      chatProviderForUser(userId),
      embedProviderForUser(userId),
    ]);
    const result = await rescoreMatches(new ObjectId(userId), { visaOnly }, chat, embed);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Rescore failed";
    const status = message.includes("CV") || message.includes("API key") ? 400 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
