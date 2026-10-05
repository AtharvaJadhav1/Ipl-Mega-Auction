import { NextResponse } from "next/server";
import { withSessionLock } from "@/lib/lock";
import { startBidding } from "@/server/game";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  try {
    const session = await withSessionLock(id, () => startBidding(id));
    return NextResponse.json(session);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unable to start bidding.";
    return NextResponse.json({ error: message }, { status: message === "Auction not found." ? 404 : 400 });
  }
}
