import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { auth } from "@/auth";
import { getCollection } from "@/lib/db/mongo";
import type { MatchDoc } from "@/lib/db/schema";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 50), 100);

  const matches = await getCollection<MatchDoc>("matches");
  const items = await matches
    .aggregate([
      { $match: { userId: new ObjectId(session.user.id) } },
      { $sort: { fitScore: -1, scoredAt: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: "jobs",
          localField: "jobId",
          foreignField: "_id",
          as: "job",
        },
      },
      { $unwind: "$job" },
      {
        $project: {
          fitScore: 1,
          rationale: 1,
          skillGaps: 1,
          sponsorshipFit: 1,
          scoredAt: 1,
          "job._id": 1,
          "job.title": 1,
          "job.company": 1,
          "job.location": 1,
          "job.country": 1,
          "job.remote": 1,
          "job.applyUrl": 1,
          "job.source": 1,
          "job.mentionsVisaSponsorship": 1,
        },
      },
    ])
    .toArray();

  return NextResponse.json({ items });
}
