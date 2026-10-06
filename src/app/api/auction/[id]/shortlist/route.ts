import { NextResponse } from "next/server";
import { z } from "zod";
import { withSessionLock } from "@/lib/lock";
import { confirmShortlist } from "@/server/game";

const schema = z.object({ playerIds: z.array(z.string()).max(80) });

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid shortlist." }, { status: 400 });
  try {
    return NextResponse.json(await withSessionLock(id, () => confirmShortlist(id, parsed.data.playerIds)));
  } catch (e) {
    const message = e instanceof Error ? e.message : "Shortlist failed.";
    return NextResponse.json({ error: message }, { status: message === "Auction not found." ? 404 : 400 });
  }
}
