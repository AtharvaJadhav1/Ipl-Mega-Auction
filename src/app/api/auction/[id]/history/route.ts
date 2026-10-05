import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const exists = await prisma.auctionSession.findUnique({ where: { id }, select: { id: true } });
  if (!exists) return NextResponse.json({ error: "Auction not found." }, { status: 404 });
  const events = await prisma.auctionEvent.findMany({
    where: { sessionId: id },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
  const bids = await prisma.bid.findMany({
    where: { sessionId: id },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
  return NextResponse.json({ events, bids });
}
