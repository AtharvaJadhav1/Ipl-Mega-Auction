import { NextResponse } from "next/server";
import { z } from "zod";
import { withSessionLock } from "@/lib/lock";
import { listTrades, proposeTrade } from "@/server/game";

const schema = z.object({
  partnerFranchiseId: z.string(),
  offerPlayerIds: z.array(z.string()).min(1).max(5),
  requestPlayerIds: z.array(z.string()).min(1).max(5),
});

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return NextResponse.json({ trades: await listTrades(id) });
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid trade proposal." }, { status: 400 });
  try {
    const result = await withSessionLock(id, () =>
      proposeTrade(id, parsed.data.partnerFranchiseId, parsed.data.offerPlayerIds, parsed.data.requestPlayerIds),
    );
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Trade failed.";
    return NextResponse.json({ error: message }, { status: message === "Auction not found." ? 404 : 400 });
  }
}
