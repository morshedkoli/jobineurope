import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { enrichGithub, GithubNotConnectedError } from "@/lib/profile/github";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const github = await enrichGithub(session.user.id);
    return NextResponse.json({ ok: true, github });
  } catch (err) {
    if (err instanceof GithubNotConnectedError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    console.error("GitHub enrichment failed", err);
    return NextResponse.json({ error: "Could not read your GitHub profile." }, { status: 502 });
  }
}
