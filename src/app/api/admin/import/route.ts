import { NextResponse } from "next/server";
import { importCsv } from "@/server/game";

/** Imports are open in local development; in production they require `Authorization: Bearer $ADMIN_TOKEN`. */
function authorised(req: Request) {
  const token = process.env.ADMIN_TOKEN;
  if (!token) return process.env.NODE_ENV !== "production";
  return req.headers.get("authorization") === `Bearer ${token}`;
}

export async function POST(req: Request) {
  if (!authorised(req)) return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
  const csv = await req.text();
  if (!csv.trim()) return NextResponse.json({ error: "Empty file." }, { status: 400 });
  try {
    return NextResponse.json(await importCsv(csv));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Import failed." }, { status: 500 });
  }
}
