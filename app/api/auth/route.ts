import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { signToken, COOKIE } from "@/lib/auth";
import { createSession } from "@/lib/db";
import { iptv } from "@/lib/iptv";

export async function POST(req: NextRequest) {
  const { server, username, password } = await req.json();

  if (!server || !username || !password)
    return NextResponse.json({ error: "Champs manquants" }, { status: 400 });

  // Normalise le server (retire le slash final)
  const normalServer = server.replace(/\/$/, "");

  try {
    await iptv.authenticate({ server: normalServer, username, password });
  } catch {
    return NextResponse.json({ error: "Identifiants invalides ou serveur inaccessible" }, { status: 401 });
  }

  const sessionId = randomUUID();
  createSession(sessionId, normalServer, username, password);
  const token = await signToken(sessionId);

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7, // 7 jours
    path: "/",
  });
  return res;
}
