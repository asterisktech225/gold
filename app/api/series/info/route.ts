import { NextRequest, NextResponse } from "next/server";
import { requireCreds } from "@/lib/api-helpers";
import { iptv } from "@/lib/iptv";

export async function GET(req: NextRequest) {
  const r = await requireCreds();
  if (r instanceof NextResponse) return r;
  const seriesId = req.nextUrl.searchParams.get("seriesId") ?? "";
  const data = await iptv.seriesInfo(r.creds, seriesId);
  return NextResponse.json(data);
}
