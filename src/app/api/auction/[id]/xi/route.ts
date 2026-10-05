import { NextResponse } from "next/server";
import { z } from "zod";
import { withSessionLock } from "@/lib/lock";
import { saveXi } from "@/server/game";

const schema = z.object({
  slots: z.array(
    z.object({
      slotKey: z.string(),
      playerId: z.string().nullable(),
      orderIndex: z.number().int(),
    }),
  ),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid playing XI payload." }, { status: 400 });
  try {
    const session = await withSessionLock(id, () => saveXi(id, parsed.data.slots));
    return NextResponse.json(session);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not save XI.";
    return NextResponse.json({ error: message }, { status: message === "Auction not found." ? 404 : 400 });
  }
}
