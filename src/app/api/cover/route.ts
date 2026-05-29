import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { auth } from "@/auth";
import { getCollection } from "@/lib/db/mongo";
import {
  generateCoverLetter,
  isTone,
  JobNotFoundError,
  ProfileMissingError,
} from "@/lib/cover/generate";
import type { CoverLetterDoc } from "@/lib/db/schema";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BODY_CHARS = 8000;

async function requireUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

/** List saved cover-letter versions for a job (newest first). */
export async function GET(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const jobId = new URL(req.url).searchParams.get("jobId");
  if (!jobId || !ObjectId.isValid(jobId)) {
    return NextResponse.json({ error: "A valid jobId is required." }, { status: 400 });
  }

  const coverLetters = await getCollection<CoverLetterDoc>("coverLetters");
  const items = await coverLetters
    .find({ userId: new ObjectId(userId), jobId: new ObjectId(jobId) })
    .sort({ version: -1 })
    .toArray();

  return NextResponse.json({ items });
}

/** Generate a new cover-letter version for a job. */
export async function POST(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let payload: { jobId?: unknown; tone?: unknown };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { jobId, tone } = payload;
  if (typeof jobId !== "string" || !ObjectId.isValid(jobId)) {
    return NextResponse.json({ error: "A valid jobId is required." }, { status: 400 });
  }
  if (!isTone(tone)) {
    return NextResponse.json({ error: "Unknown tone." }, { status: 400 });
  }

  try {
    const doc = await generateCoverLetter(userId, jobId, tone);
    return NextResponse.json({ ok: true, coverLetter: doc });
  } catch (err) {
    if (err instanceof ProfileMissingError || err instanceof JobNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    console.error("Cover-letter generation failed", err);
    return NextResponse.json({ error: "Could not generate a cover letter." }, { status: 502 });
  }
}

/** Save an edited body as a new version (preserves AI drafts). */
export async function PUT(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let payload: { jobId?: unknown; body?: unknown; tone?: unknown };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { jobId, body, tone } = payload;
  if (typeof jobId !== "string" || !ObjectId.isValid(jobId)) {
    return NextResponse.json({ error: "A valid jobId is required." }, { status: 400 });
  }
  if (typeof body !== "string" || body.trim().length === 0) {
    return NextResponse.json({ error: "Cover-letter body is required." }, { status: 400 });
  }
  if (body.length > MAX_BODY_CHARS) {
    return NextResponse.json({ error: "Cover letter is too long." }, { status: 400 });
  }

  const coverLetters = await getCollection<CoverLetterDoc>("coverLetters");
  const userOid = new ObjectId(userId);
  const jobOid = new ObjectId(jobId);

  const last = await coverLetters.find({ userId: userOid, jobId: jobOid }).sort({ version: -1 }).limit(1).next();
  const doc: CoverLetterDoc = {
    _id: new ObjectId(),
    userId: userOid,
    jobId: jobOid,
    version: (last?.version ?? 0) + 1,
    body: body.trim(),
    tone: isTone(tone) ? tone : last?.tone,
    createdAt: new Date(),
  };
  await coverLetters.insertOne(doc);

  return NextResponse.json({ ok: true, coverLetter: doc });
}
