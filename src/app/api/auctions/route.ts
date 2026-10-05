import { NextResponse } from "next/server";
import { listSessions } from "@/server/game";

export async function GET() {
  return NextResponse.json({ sessions: await listSessions() });
}
