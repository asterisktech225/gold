import { NextRequest, NextResponse } from "next/server";
import { requireCreds } from "@/lib/api-helpers";
import { iptv } from "@/lib/iptv";

const IPTV_UA = "Lavf/60.16.100";

export async function GET(req: NextRequest) {
  const r = await requireCreds();
  if (r instanceof NextResponse) return r;

  const streamId = req.nextUrl.searchParams.get("streamId") ?? "";
  const ext = req.nextUrl.searchParams.get("ext") ?? "mp4";
  const url = iptv.episodeUrl(r.creds, streamId, ext);

  const range = req.headers.get("range");

  const headers: Record<string, string> = {
    "User-Agent": IPTV_UA,
    Accept: "*/*",
    Connection: "keep-alive",
  };
  if (range) headers["Range"] = range;

  let upstream: Response;
  try {
    upstream = await fetch(url, { headers, cache: "no-store", redirect: "follow" });
  } catch {
    return NextResponse.json({ error: "Serveur IPTV inaccessible" }, { status: 502 });
  }

  if (!upstream.ok) {
    return NextResponse.json({ error: `IPTV ${upstream.status}` }, { status: upstream.status });
  }

  const respHeaders: Record<string, string> = {
    "Content-Type": upstream.headers.get("Content-Type") ?? "video/mp4",
    "Cache-Control": "no-cache, no-store",
    "Access-Control-Allow-Origin": "*",
  };

  const contentLength = upstream.headers.get("Content-Length");
  if (contentLength) respHeaders["Content-Length"] = contentLength;

  const contentRange = upstream.headers.get("Content-Range");
  if (contentRange) respHeaders["Content-Range"] = contentRange;

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: respHeaders,
  });
}
