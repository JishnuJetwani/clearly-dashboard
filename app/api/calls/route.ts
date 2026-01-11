import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const candidateName = searchParams.get("candidate_name"); // simple for now

  const client = await clientPromise;
  const db = client.db();
  const calls = db.collection("vapi_calls");

  const query: any = {};
  if (candidateName) query.candidate_name = candidateName;

  const results = await calls
    .find(query)
    .sort({ updatedAt: -1 })
    .limit(20)
    .toArray();

  return NextResponse.json({ ok: true, results });
}
