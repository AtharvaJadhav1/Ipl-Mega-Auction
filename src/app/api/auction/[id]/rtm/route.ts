import { NextResponse } from "next/server";
import { z } from "zod";
import { withSessionLock } from "@/lib/lock";
import { userRtm } from "@/server/game";

const schema = z.object({ action: z.enum(["match", "decline", "raise", "stand"]) });

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid RTM action." }, { status: 400 });
  try {
    return NextResponse.json(await withSessionLock(id, () => userRtm(id, parsed.data.action)));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "RTM failed." }, { status: 400 });
  }
}
