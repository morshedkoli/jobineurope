import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { auth } from "@/auth";
import {
  ApplicationNotFoundError,
  deleteApplication,
  isStatus,
  updateApplication,
} from "@/lib/applications/track";

export const runtime = "nodejs";

async function requireUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid application id." }, { status: 400 });
  }

  let payload: { status?: unknown; notes?: unknown };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (payload.status !== undefined && !isStatus(payload.status)) {
    return NextResponse.json({ error: "Unknown status." }, { status: 400 });
  }
  if (payload.notes !== undefined && typeof payload.notes !== "string") {
    return NextResponse.json({ error: "Notes must be text." }, { status: 400 });
  }

  try {
    const application = await updateApplication(userId, id, {
      status: isStatus(payload.status) ? payload.status : undefined,
      notes: typeof payload.notes === "string" ? payload.notes : undefined,
    });
    return NextResponse.json({ ok: true, application });
  } catch (err) {
    if (err instanceof ApplicationNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    throw err;
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid application id." }, { status: 400 });
  }

  try {
    await deleteApplication(userId, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ApplicationNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    throw err;
  }
}
