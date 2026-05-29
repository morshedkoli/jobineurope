import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { auth } from "@/auth";
import { listApplications, saveApplication } from "@/lib/applications/track";

export const runtime = "nodejs";

async function requireUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const items = await listApplications(userId);
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let payload: { jobId?: unknown };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { jobId } = payload;
  if (typeof jobId !== "string" || !ObjectId.isValid(jobId)) {
    return NextResponse.json({ error: "A valid jobId is required." }, { status: 400 });
  }

  const application = await saveApplication(userId, jobId);
  return NextResponse.json({ ok: true, application });
}
