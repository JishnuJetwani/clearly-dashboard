import { NextResponse } from "next/server";
import { listCandidatesDb, addCandidateDb } from "@/lib/candidatesRepo";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(await listCandidatesDb());
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as
    | { fullName?: string; email?: string }
    | null;

  const fullName = body?.fullName?.trim();
  const email = body?.email?.trim()?.toLowerCase();

  if (!fullName) return NextResponse.json({ error: "Name is required" }, { status: 400 });
  if (!email || !email.includes("@"))
    return NextResponse.json({ error: "Valid email is required" }, { status: 400 });

  const created = await addCandidateDb({ fullName, email });
  return NextResponse.json(created, { status: 201 });
}
