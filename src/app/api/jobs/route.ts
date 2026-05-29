import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getCollection } from "@/lib/db/mongo";
import type { JobDoc } from "@/lib/db/schema";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const visaOnly = url.searchParams.get("visa") === "1";
  const country = url.searchParams.get("country")?.toUpperCase();
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 25), 100);

  const filter: Record<string, unknown> = {};
  if (visaOnly) filter.mentionsVisaSponsorship = true;
  if (country) filter.country = country;

  const jobs = await getCollection<JobDoc>("jobs");
  const [total, items] = await Promise.all([
    jobs.countDocuments(filter),
    jobs
      .find(filter, {
        projection: { descriptionText: 0, jobEmbedding: 0 },
      })
      .sort({ postedAt: -1, fetchedAt: -1 })
      .limit(limit)
      .toArray(),
  ]);

  return NextResponse.json({ total, items });
}
