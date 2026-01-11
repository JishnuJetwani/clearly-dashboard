import { NextResponse } from "next/server";
import { VapiClient } from "@vapi-ai/server-sdk";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const vapi = new VapiClient({
  token: process.env.VAPI_API_KEY || "",
});

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const { candidateName, companyName, referencePhone } = body ?? {};

    // Basic validation
    if (!candidateName || !companyName || !referencePhone) {
      return NextResponse.json(
        { error: "Missing candidateName, companyName, or referencePhone" },
        { status: 400 }
      );
    }

    // Env validation
    if (
      !process.env.VAPI_API_KEY ||
      !process.env.VAPI_PHONE_NUMBER_ID ||
      !process.env.VAPI_ASSISTANT_ID
    ) {
      return NextResponse.json(
        { error: "Server is missing VAPI env vars" },
        { status: 500 }
      );
    }

    const result = await vapi.calls.create({
      phoneNumberId: process.env.VAPI_PHONE_NUMBER_ID,
      customer: { number: referencePhone },
      assistantId: process.env.VAPI_ASSISTANT_ID,
      assistantOverrides: {
        variableValues: {
          candidate_name: candidateName,
          company_name: companyName,
        },
      },
    });

    // SDK typing can vary by version; extract call id safely
    const callId =
      (result as any)?.id ??
      (result as any)?.callId ??
      (result as any)?.call?.id ??
      (result as any)?.data?.id;

    if (!callId) {
      return NextResponse.json(
        { error: "Vapi did not return a call id", raw: result },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, callId });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to create call", details: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
