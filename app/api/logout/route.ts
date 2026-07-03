import { NextResponse } from "next/server";
import { getSessionId, COOKIE } from "@/lib/auth";
import { deleteSession } from "@/lib/db";

export async function POST() {
  const sessionId = await getSessionId();
  if (sessionId) deleteSession(sessionId);

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, "", { maxAge: 0, path: "/" });
  return res;
}
