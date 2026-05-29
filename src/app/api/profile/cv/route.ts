import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { auth } from "@/auth";
import { getCollection } from "@/lib/db/mongo";
import { pdfToText, parseCvText } from "@/lib/profile/parse-cv";
import type { ProfileDoc } from "@/lib/db/schema";

export const runtime = "nodejs";
const MAX_BYTES = 8 * 1024 * 1024; // 8 MB

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get("cv");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No CV file provided" }, { status: 400 });
  }
  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "CV must be a PDF" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "CV exceeds 8 MB limit" }, { status: 400 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());

  let rawText: string;
  try {
    rawText = await pdfToText(bytes);
  } catch {
    return NextResponse.json({ error: "Could not read PDF" }, { status: 422 });
  }
  if (rawText.length < 50) {
    return NextResponse.json(
      { error: "PDF has too little text (is it a scanned image?)" },
      { status: 422 },
    );
  }

  let structuredCv;
  try {
    structuredCv = await parseCvText(rawText);
  } catch (err) {
    console.error("CV parse failed", err);
    return NextResponse.json({ error: "AI parsing failed" }, { status: 502 });
  }

  const userId = new ObjectId(session.user.id);
  const profiles = await getCollection<ProfileDoc>("profile");
  await profiles.updateOne(
    { userId },
    {
      $set: { structuredCv, rawCvText: rawText, updatedAt: new Date() },
      $setOnInsert: { userId },
    },
    { upsert: true },
  );

  return NextResponse.json({ ok: true, structuredCv });
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const profiles = await getCollection<ProfileDoc>("profile");
  const profile = await profiles.findOne({ userId: new ObjectId(session.user.id) });
  return NextResponse.json({ structuredCv: profile?.structuredCv ?? null });
}
