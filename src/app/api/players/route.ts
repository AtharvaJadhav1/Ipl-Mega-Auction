import { NextResponse } from "next/server";
import { listPlayers } from "@/server/game";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const players = await listPlayers({
    search: url.searchParams.get("search") ?? undefined,
    role: url.searchParams.get("role") ?? undefined,
    overseas: url.searchParams.get("overseas") ?? undefined,
    capped: url.searchParams.get("capped") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    sessionId: url.searchParams.get("sessionId") ?? undefined,
  });
  return NextResponse.json({ players, count: players.length });
}
