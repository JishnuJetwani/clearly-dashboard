import { NextResponse } from "next/server";
import clientPromise from "../../../../lib/mongodb";

export const runtime = "nodejs";

export async function GET() {
  const client = await clientPromise;
  const result = await client.db().admin().ping();
  return NextResponse.json({ ok: true, result });
}
