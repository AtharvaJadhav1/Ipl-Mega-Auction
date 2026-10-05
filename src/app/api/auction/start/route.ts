import { NextResponse } from "next/server";
import { FRANCHISES } from "@/data/franchises";
import { CHALLENGES, latestSession, startAuction } from "@/server/game";
import { z } from "zod";

const schema = z.object({
  userFranchiseId: z.string(),
  mode: z.enum(["mega", "mini", "quick", "custom"]),
  difficulty: z.enum(["easy", "medium", "hard", "expert"]),
  speed: z.enum(["slow", "normal", "fast", "instant"]),
  soundEnabled: z.boolean().optional().default(true),
  aiAggression: z.number().min(0).max(100).optional().default(50),
  challengeId: z.string().optional(),
  customPurse: z.number().int().min(100_000_000).max(2_000_000_000).optional(),
  maxOverseas: z.number().int().min(2).max(8).optional(),
  name: z.string().max(60).optional(),
});

export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json());
    if (!FRANCHISES.some((f) => f.id === body.userFranchiseId)) {
      return NextResponse.json({ error: "Unknown franchise." }, { status: 400 });
    }
    if (body.challengeId && !CHALLENGES.some((c) => c.id === body.challengeId)) {
      return NextResponse.json({ error: "Unknown challenge." }, { status: 400 });
    }
    const session = await startAuction(body);
    return NextResponse.json(session);
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: "Invalid auction settings." }, { status: 400 });
    const message = e instanceof Error ? e.message : "Unable to start auction.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  const latest = await latestSession();
  return NextResponse.json({ latestId: latest?.id ?? null, challenges: CHALLENGES, franchises: FRANCHISES });
}
