import { NextRequest, NextResponse } from "next/server";
import { requireCreds } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  const r = await requireCreds();
  if (r instanceof NextResponse) return r;
  const streamId = req.nextUrl.searchParams.get("streamId") ?? "";
  // Retourne l'URL du proxy HLS au lieu de l'URL IPTV directe.
  // Cela évite que le navigateur contacte le serveur IPTV directement
  // (ce qui provoque des erreurs 509 / CORS / User-Agent rejeté).
  return NextResponse.json({ url: `/api/live/hls?streamId=${streamId}` });
}
