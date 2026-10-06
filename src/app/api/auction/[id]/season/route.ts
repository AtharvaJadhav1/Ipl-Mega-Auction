import { NextResponse } from "next/server";
import { z } from "zod";
import { withSessionLock } from "@/lib/lock";
import { getSeason, runSeason } from "@/server/game";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return NextResponse.json({ season: await getSeason(id) });
}

const schema = z.object({ reroll: z.boolean().optional() });

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  try {
    const season = await withSessionLock(id, () => runSeason(id, parsed.success ? !!parsed.data.reroll : false));
    return NextResponse.json({ season });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Season failed.";
    return NextResponse.json({ error: message }, { status: message === "Auction not found." ? 404 : 400 });
  }
}
