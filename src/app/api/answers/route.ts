import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  ANSWER_FIELDS,
  draftAnswers,
  getAnswers,
  ProfileMissingError,
  saveAnswers,
} from "@/lib/apply/answers";

export const runtime = "nodejs";
export const maxDuration = 60;

async function requireUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

/** Return the field schema + the user's saved answers. */
export async function GET() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const fields = await getAnswers(userId);
  return NextResponse.json({ schema: ANSWER_FIELDS, fields });
}

/** Draft answers from the profile via the LLM (does not persist). */
export async function POST() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const fields = await draftAnswers(userId);
    return NextResponse.json({ ok: true, fields });
  } catch (err) {
    if (err instanceof ProfileMissingError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    console.error("Answer drafting failed", err);
    return NextResponse.json({ error: "Could not draft answers." }, { status: 502 });
  }
}

/** Save edited answers. */
export async function PUT(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let payload: { fields?: unknown };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { fields } = payload;
  if (typeof fields !== "object" || fields === null || Array.isArray(fields)) {
    return NextResponse.json({ error: "fields must be an object." }, { status: 400 });
  }

  const saved = await saveAnswers(userId, fields as Record<string, string>);
  return NextResponse.json({ ok: true, fields: saved });
}
