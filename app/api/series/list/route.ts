import { NextRequest, NextResponse } from "next/server";
import { requireCreds } from "@/lib/api-helpers";
import { iptv } from "@/lib/iptv";

export async function GET(req: NextRequest) {
  const r = await requireCreds();
  if (r instanceof NextResponse) return r;
  const catId = req.nextUrl.searchParams.get("categoryId") ?? "";
  const data = await iptv.series(r.creds, catId);
  return NextResponse.json(data);
}
