import { NextRequest, NextResponse } from "next/server";
import { requireCreds } from "@/lib/api-helpers";
import { iptv } from "@/lib/iptv";

const IPTV_UA = "Lavf/60.16.100";

function resolveUrl(url: string, base: string): string {
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/")) return new URL(base).origin + url;
  return new URL(url, base).toString();
}

function toProxyUrl(absUrl: string): string {
  return `/api/live/hls?proxyUrl=${encodeURIComponent(absUrl)}`;
}

function rewritePlaylist(text: string, baseUrl: string): string {
  return text
    .replace(/URI="([^"]+)"/g, (_, uri) =>
      `URI="${toProxyUrl(resolveUrl(uri, baseUrl))}"`,
    )
    .replace(/^(?!#)(.+)$/gm, (line) => {
      const trimmed = line.trim();
      if (!trimmed) return line;
      if (trimmed.startsWith("#")) return line;
      const abs = resolveUrl(trimmed, baseUrl);
      if (/\.ts(\?|$)/i.test(trimmed)) return toProxyUrl(abs);
      if (trimmed.includes(".m3u8")) return toProxyUrl(abs);
      return line;
    });
}

async function proxyFetch(url: string): Promise<NextResponse> {
  const reqHeaders: Record<string, string> = {
    "User-Agent": IPTV_UA,
    Accept: "*/*",
    Connection: "keep-alive",
  };

  let upstream: Response;
  try {
    upstream = await fetch(url, { headers: reqHeaders, cache: "no-store", redirect: "follow" });
  } catch {
    return NextResponse.json({ error: "Serveur IPTV inaccessible" }, { status: 502 });
  }

  if (!upstream.ok) {
    return NextResponse.json({ error: `IPTV ${upstream.status}` }, { status: upstream.status });
  }

  const ct = upstream.headers.get("Content-Type") ?? "";
  const isPlaylist = ct.includes("mpegurl") || ct.includes("m3u8") || url.includes(".m3u8");

  if (isPlaylist) {
    const text = await upstream.text();
    const rewritten = rewritePlaylist(text, url);

    return new NextResponse(rewritten, {
      headers: {
        "Content-Type": "application/vnd.apple.mpegurl",
        "Cache-Control": "no-cache, no-store",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: {
      "Content-Type": ct || "video/MP2T",
      "Cache-Control": "no-cache, no-store",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  // Proxy direct (pour les segments et variantes)
  const proxyUrl = searchParams.get("proxyUrl");
  if (proxyUrl) {
    return proxyFetch(decodeURIComponent(proxyUrl));
  }

  // Stream principal — retourne la playlist HLS proxifiée
  const streamId = searchParams.get("streamId");
  if (streamId) {
    const r = await requireCreds();
    if (r instanceof NextResponse) return r;

    const inputUrl = iptv.liveUrl(r.creds, streamId);
    return proxyFetch(inputUrl);
  }

  return NextResponse.json({ error: "streamId ou proxyUrl requis" }, { status: 400 });
}
