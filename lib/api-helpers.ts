import { NextResponse } from "next/server";
import { getSessionId } from "./auth";
import { getSession } from "./db";
import type { Creds } from "./iptv";

/** Récupère les credentials depuis le cookie JWT + SQLite. Renvoie 401 si invalide. */
export async function requireCreds(): Promise<{ creds: Creds } | NextResponse> {
  const sessionId = await getSessionId();
  if (!sessionId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const session = getSession(sessionId);
  if (!session) return NextResponse.json({ error: "Session expirée" }, { status: 401 });

  return { creds: session };
}
