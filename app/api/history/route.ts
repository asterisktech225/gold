import { NextRequest, NextResponse } from "next/server";
import { requireCreds } from "@/lib/api-helpers";
import { userKey, getLastWatched, setLastWatched } from "@/lib/db";

const TYPES = ["live", "movie", "series"];

/** Dernier contenu regardé par type : { live?, movie?, series? } */
export async function GET() {
  const r = await requireCreds();
  if (r instanceof NextResponse) return r;

  const rows = await getLastWatched(userKey(r.creds.server, r.creds.username));
  const out: Record<string, any> = {};
  for (const row of rows as any[]) {
    let data = null;
    try { data = row.data ? JSON.parse(row.data) : null; } catch {}
    out[row.type] = { ...row, data };
  }
  return NextResponse.json(out);
}

export async function POST(req: NextRequest) {
  const r = await requireCreds();
  if (r instanceof NextResponse) return r;

  const { type, streamId, name, cover, data } = await req.json();
  if (!TYPES.includes(type) || !streamId || !name)
    return NextResponse.json({ error: "Paramètres invalides" }, { status: 400 });

  await setLastWatched(
    userKey(r.creds.server, r.creds.username),
    type,
    String(streamId),
    name,
    cover ?? null,
    data ? JSON.stringify(data) : null
  );
  return NextResponse.json({ ok: true });
}
