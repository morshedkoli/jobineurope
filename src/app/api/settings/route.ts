import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { getSettings, updateSettings } from "@/lib/settings/store";

export const runtime = "nodejs";

const settingsSchema = z.object({
  targetCountries: z.array(z.string().trim().min(2).max(2)).max(20).optional(),
  englishOnly: z.boolean().optional(),
  needsVisaSponsorship: z.boolean().optional(),
});

async function requireUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const settings = await getSettings(userId);
  return NextResponse.json({ settings });
}

export async function PUT(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = settingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid settings" }, { status: 400 });
  }

  const normalized = {
    ...parsed.data,
    ...(parsed.data.targetCountries && {
      targetCountries: parsed.data.targetCountries.map((c) => c.toUpperCase()),
    }),
  };

  const settings = await updateSettings(userId, normalized);
  return NextResponse.json({ settings });
}
