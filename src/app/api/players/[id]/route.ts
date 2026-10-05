import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureCatalog } from "@/server/game";
import { gameRatings } from "@/engine/ratings";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  await ensureCatalog();
  const { id } = await ctx.params;
  const player = await prisma.player.findUnique({ where: { id } });
  if (!player) return NextResponse.json({ error: "Player not found." }, { status: 404 });
  return NextResponse.json({ ...player, ratings: gameRatings(player) });
}
