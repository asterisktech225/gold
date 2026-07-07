import { NextResponse } from "next/server";
import { requireCreds, iptvJson } from "@/lib/api-helpers";
import { iptv } from "@/lib/iptv";

export async function GET() {
  const r = await requireCreds();
  if (r instanceof NextResponse) return r;
  return iptvJson(() => iptv.vodCategories(r.creds));
}
