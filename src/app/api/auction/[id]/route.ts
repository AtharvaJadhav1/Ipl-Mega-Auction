import { NextResponse } from "next/server";
import { z } from "zod";
import { withSessionLock } from "@/lib/lock";
import { deleteSession, getSession, renameSession } from "@/server/game";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const session = await getSession(id);
  if (!session) return NextResponse.json({ error: "Auction not found." }, { status: 404 });
  return NextResponse.json(session);
}

const patchSchema = z.object({ name: z.string().max(60) });

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid name." }, { status: 400 });
  try {
    return NextResponse.json(await withSessionLock(id, () => renameSession(id, parsed.data.name)));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Rename failed." }, { status: 404 });
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  await withSessionLock(id, () => deleteSession(id));
  return NextResponse.json({ ok: true });
}
