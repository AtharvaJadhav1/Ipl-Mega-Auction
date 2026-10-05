import { NextResponse } from "next/server";
import { withSessionLock } from "@/lib/lock";
import { tickAuction } from "@/server/game";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  try {
    const session = await withSessionLock(id, () => tickAuction(id));
    return NextResponse.json(session);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Tick failed." }, { status: 400 });
  }
}
