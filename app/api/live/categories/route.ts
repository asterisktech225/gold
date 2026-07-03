import { NextResponse } from "next/server";
import { requireCreds } from "@/lib/api-helpers";
import { iptv } from "@/lib/iptv";

export async function GET() {
  const r = await requireCreds();
  if (r instanceof NextResponse) return r;
  const data = await iptv.liveCategories(r.creds);
  return NextResponse.json(data);
}
