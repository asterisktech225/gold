import { NextResponse } from "next/server";
import { getSessionId } from "./auth";
import { getSession } from "./db";
import type { Creds } from "./iptv";

/** Récupère les credentials depuis le cookie JWT + SQLite. Renvoie 401 si invalide. */
export async function requireCreds(): Promise<{ creds: Creds } | NextResponse> {
  const sessionId = await getSessionId();
  if (!sessionId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const session = await getSession(sessionId);
  if (!session) return NextResponse.json({ error: "Session expirée" }, { status: 401 });

  return { creds: session };
}

/** Exécute un appel IPTV et renvoie toujours du JSON, même si le serveur IPTV est down. */
export async function iptvJson(fn: () => Promise<any>): Promise<NextResponse> {
  try {
    return NextResponse.json(await fn());
  } catch {
    return NextResponse.json({ error: "Serveur IPTV inaccessible" }, { status: 502 });
  }
}
