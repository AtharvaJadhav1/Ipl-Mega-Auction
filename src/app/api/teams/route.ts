import { NextResponse } from "next/server";
import { FRANCHISES } from "@/data/franchises";
import { ensureCatalog } from "@/server/game";

export async function GET() {
  await ensureCatalog();
  return NextResponse.json({ teams: FRANCHISES });
}
