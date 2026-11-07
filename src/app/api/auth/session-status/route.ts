import { NextResponse } from "next/server";
import { isSessionRevoked, touchSessionActivity } from "@/lib/security-store";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get("sessionId");

  if (!sessionId) {
    return NextResponse.json({ error: "sessionId parameter is required" }, { status: 400 });
  }

  const revoked = await isSessionRevoked(sessionId);
  if (revoked) {
    return NextResponse.json(
      { active: false, revoked: true, error: "This session has been revoked or expired due to inactivity." },
      { status: 401 },
    );
  }

  await touchSessionActivity(sessionId);

  return NextResponse.json({ active: true, sessionId });
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
    }

    const revoked = await isSessionRevoked(sessionId);
    if (revoked) {
      return NextResponse.json(
        { active: false, revoked: true, error: "This session has been revoked or expired due to inactivity." },
        { status: 401 },
      );
    }

    await touchSessionActivity(sessionId);

    return NextResponse.json({ active: true, sessionId });
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "Failed to verify session status";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
