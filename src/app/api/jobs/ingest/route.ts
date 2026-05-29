import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { ingestAll } from "@/lib/jobs/ingest";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Allow either a signed-in user (manual refresh) or a cron secret. */
async function isAuthorized(req: Request): Promise<boolean> {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const header = req.headers.get("authorization");
    if (header === `Bearer ${cronSecret}`) return true;
  }
  const session = await auth();
  return Boolean(session?.user?.id);
}

async function handle(req: Request) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await ingestAll();
  return NextResponse.json(result);
}

export async function POST(req: Request) {
  return handle(req);
}

// GET allows Vercel Cron (which issues GET) to trigger ingestion too.
export async function GET(req: Request) {
  return handle(req);
}
