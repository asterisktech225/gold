import { NextRequest, NextResponse } from "next/server";
import { requireCreds } from "@/lib/api-helpers";
import { iptv } from "@/lib/iptv";

const IPTV_UA = "Lavf/60.16.100";

function resolveUrl(url: string, base: string): string {
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/")) return new URL(base).origin + url;
  return new URL(url, base).toString();
}

function toProxyUrl(absUrl: string, cookies: string): string {
  let p = `/api/live/hls?proxyUrl=${encodeURIComponent(absUrl)}`;
  if (cookies) p += `&ck=${encodeURIComponent(cookies)}`;
  return p;
}

function rewritePlaylist(text: string, baseUrl: string, cookies: string): string {
  return text
    .replace(/URI="([^"]+)"/g, (_, uri) =>
      `URI="${toProxyUrl(resolveUrl(uri, baseUrl), cookies)}"`,
    )
    .replace(/^(?!#)(.+)$/gm, (line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return line;
      const abs = resolveUrl(trimmed, baseUrl);
      if (/\.ts(\?|$)/i.test(trimmed)) return toProxyUrl(abs, cookies);
      if (trimmed.includes(".m3u8")) return toProxyUrl(abs, cookies);
      return line;
    });
}

function extractCookies(headers: Headers): string {
  const raw: string[] =
    typeof (headers as any).getSetCookie === "function"
      ? (headers as any).getSetCookie()
      : [];
  return raw.map((c) => c.split(";")[0].trim()).filter(Boolean).join("; ");
}

function mergeCookies(base: string, incoming: string): string {
  const map = new Map<string, string>();
  for (const part of [...base.split(";"), ...incoming.split(";")]) {
    const kv = part.trim();
    if (!kv) continue;
    const eq = kv.indexOf("=");
    const key = eq >= 0 ? kv.slice(0, eq).trim() : kv;
    map.set(key, kv);
  }
  return [...map.values()].join("; ");
}

async function proxyFetch(url: string, sessionCookies: string): Promise<NextResponse> {
  const origin = new URL(url).origin;
  const reqHeaders: Record<string, string> = {
    "User-Agent": IPTV_UA,
    Accept: "*/*",
    Connection: "keep-alive",
    Referer: `${origin}/`,
  };
  if (sessionCookies) reqHeaders["Cookie"] = sessionCookies;

  let upstream: Response;
  try {
    upstream = await fetch(url, { headers: reqHeaders, cache: "no-store", redirect: "follow" });
  } catch (err) {
    console.error("[HLS proxy] fetch error:", err);
    return NextResponse.json({ error: "Serveur IPTV inaccessible" }, { status: 502 });
  }

  if (!upstream.ok) {
    console.error(`[HLS proxy] ${upstream.status} ${url}`);
    return NextResponse.json({ error: `IPTV ${upstream.status}` }, { status: upstream.status });
  }

  const ct = upstream.headers.get("Content-Type") ?? "";
  const isPlaylist = ct.includes("mpegurl") || ct.includes("m3u8") || url.includes(".m3u8");

  if (isPlaylist) {
    const freshCookies = extractCookies(upstream.headers);
    const mergedCookies = mergeCookies(sessionCookies, freshCookies);

    const text = await upstream.text();
    const rewritten = rewritePlaylist(text, url, mergedCookies);

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

  // Proxy direct (segments, variantes)
  const proxyUrl = searchParams.get("proxyUrl");
  if (proxyUrl) {
    const cookies = searchParams.get("ck") ?? "";
    return proxyFetch(decodeURIComponent(proxyUrl), cookies);
  }

  // Stream principal
  const streamId = searchParams.get("streamId");
  if (streamId) {
    const r = await requireCreds();
    if (r instanceof NextResponse) return r;

    const inputUrl = iptv.liveUrl(r.creds, streamId);
    return proxyFetch(inputUrl, "");
  }

  return NextResponse.json({ error: "streamId ou proxyUrl requis" }, { status: 400 });
}
