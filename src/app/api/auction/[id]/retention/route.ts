import { NextResponse } from "next/server";
import { z } from "zod";
import { withSessionLock } from "@/lib/lock";
import { confirmRetention } from "@/server/game";

const schema = z.object({ playerIds: z.array(z.string()).max(6) });

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid retention payload." }, { status: 400 });
  try {
    return NextResponse.json(await withSessionLock(id, () => confirmRetention(id, parsed.data.playerIds)));
  } catch (e) {
    const message = e instanceof Error ? e.message : "Retention failed.";
    return NextResponse.json({ error: message }, { status: message === "Auction not found." ? 404 : 400 });
  }
}
