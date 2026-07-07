import { NextRequest, NextResponse } from "next/server";
import { requireCreds, iptvJson } from "@/lib/api-helpers";
import { iptv } from "@/lib/iptv";

export async function GET(req: NextRequest) {
  const r = await requireCreds();
  if (r instanceof NextResponse) return r;
  const seriesId = req.nextUrl.searchParams.get("seriesId") ?? "";
  return iptvJson(() => iptv.seriesInfo(r.creds, seriesId));
}
