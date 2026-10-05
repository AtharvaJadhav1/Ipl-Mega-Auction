import { NextResponse } from "next/server";
import { z } from "zod";
import { withSessionLock } from "@/lib/lock";
import { updateSettings } from "@/server/game";

const schema = z.object({
  speed: z.enum(["slow", "normal", "fast", "instant"]).optional(),
  paused: z.boolean().optional(),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid settings." }, { status: 400 });
  try {
    return NextResponse.json(await withSessionLock(id, () => updateSettings(id, parsed.data)));
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not update settings.";
    return NextResponse.json({ error: message }, { status: message === "Auction not found." ? 404 : 400 });
  }
}
