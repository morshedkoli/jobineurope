import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { enrichWebsite, InvalidWebsiteError } from "@/lib/profile/website";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let url: unknown;
  try {
    ({ url } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (typeof url !== "string" || url.trim().length === 0) {
    return NextResponse.json({ error: "A website URL is required." }, { status: 400 });
  }

  try {
    const website = await enrichWebsite(session.user.id, url);
    return NextResponse.json({ ok: true, website });
  } catch (err) {
    if (err instanceof InvalidWebsiteError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("Website enrichment failed", err);
    return NextResponse.json({ error: "Could not summarize that website." }, { status: 502 });
  }
}
