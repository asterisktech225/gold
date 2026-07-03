import { NextRequest, NextResponse } from "next/server";
import { requireCreds } from "@/lib/api-helpers";
import { iptv } from "@/lib/iptv";

export async function GET(req: NextRequest) {
  const r = await requireCreds();
  if (r instanceof NextResponse) return r;
  const streamId = req.nextUrl.searchParams.get("streamId") ?? "";
  const ext = req.nextUrl.searchParams.get("ext") ?? "mp4";
  return NextResponse.json({ url: iptv.movieUrl(r.creds, streamId, ext) });
}
