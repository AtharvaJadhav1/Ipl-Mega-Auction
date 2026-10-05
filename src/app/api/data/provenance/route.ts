import { NextResponse } from "next/server";
import { DATA_PROVENANCE } from "@/data/franchises";

export async function GET() {
  return NextResponse.json(DATA_PROVENANCE);
}
