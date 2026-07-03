/**
 * Proxy HLS avec re-stream ffmpeg.
 *
 * Le CDN de lemondair.com protège les segments .ts avec un hash anti-hotlink
 * qui ne fonctionne pas via un proxy serveur (403). On utilise ffmpeg pour
 * relire le flux IPTV et ré-émettre des segments HLS propres.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireCreds } from "@/lib/api-helpers";
import { iptv } from "@/lib/iptv";
import { spawn, type ChildProcess } from "child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync } from "fs";
import { join } from "path";

const IPTV_UA = "Lavf/60.16.100";
const HLS_DIR = "/tmp/iptv-hls";

// ─── Gestion des processus ffmpeg + heartbeat ─────────────────────────────

const ffmpegProcesses = new Map<string, ChildProcess>();
const lastHeartbeat = new Map<string, number>();
const HEARTBEAT_TIMEOUT_MS = 30_000;

function stopFfmpeg(streamId: string): void {
  const proc = ffmpegProcesses.get(streamId);
  if (proc) {
    console.log(`[ffmpeg] Stopping stream ${streamId}`);
    proc.kill("SIGTERM");
    ffmpegProcesses.delete(streamId);
  }
  lastHeartbeat.delete(streamId);
}

// Vérifie périodiquement les streams inactifs
setInterval(() => {
  const now = Date.now();
  for (const [streamId, ts] of lastHeartbeat) {
    if (now - ts > HEARTBEAT_TIMEOUT_MS) {
      console.log(`[ffmpeg] Stream ${streamId} heartbeat expired, stopping`);
      stopFfmpeg(streamId);
    }
  }
}, 10_000);

function startFfmpeg(streamId: string, inputUrl: string): void {
  if (ffmpegProcesses.has(streamId)) {
    lastHeartbeat.set(streamId, Date.now());
    return;
  }

  const outDir = join(HLS_DIR, streamId);
  mkdirSync(outDir, { recursive: true });

  // Nettoyer les anciens segments
  for (const f of readdirSync(outDir)) {
    const fp = join(outDir, f);
    try { require("fs").unlinkSync(fp); } catch {}
  }

  const args = [
    "-hide_banner", "-loglevel", "error",
    "-user_agent", IPTV_UA,
    "-i", inputUrl,
    "-c", "copy",
    "-f", "hls",
    "-hls_time", "4",
    "-hls_list_size", "6",
    "-hls_flags", "delete_segments+append_list",
    "-hls_segment_filename", join(outDir, "seg_%05d.ts"),
    join(outDir, "stream.m3u8"),
  ];

  console.log(`[ffmpeg] Starting for stream ${streamId}: ffmpeg ${args.join(" ")}`);

  const proc = spawn("ffmpeg", args, { stdio: ["ignore", "pipe", "pipe"] });

  proc.stderr?.on("data", (chunk: Buffer) => {
    const msg = chunk.toString().trim();
    if (msg) console.error(`[ffmpeg:${streamId}] ${msg}`);
  });

  proc.on("error", (err) => {
    console.error(`[ffmpeg:${streamId}] Process error:`, err);
    stopFfmpeg(streamId);
  });

  proc.on("exit", (code) => {
    console.log(`[ffmpeg:${streamId}] Exited with code ${code}`);
    stopFfmpeg(streamId);
  });

  ffmpegProcesses.set(streamId, proc);
  lastHeartbeat.set(streamId, Date.now());
}

function waitForFile(path: string, timeoutMs = 15000): Promise<boolean> {
  const start = Date.now();
  return new Promise((resolve) => {
    const check = () => {
      if (existsSync(path)) return resolve(true);
      if (Date.now() - start > timeoutMs) return resolve(false);
      setTimeout(check, 200);
    };
    check();
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────

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

function rewritePlaylist(
  text: string,
  baseUrl: string,
  cookies: string,
): string {
  return text
    .replace(/URI="([^"]+)"/g, (_, uri) =>
      `URI="${toProxyUrl(resolveUrl(uri, baseUrl), cookies)}"`,
    )
    .replace(/^(?!#)(.+)$/gm, (line) => {
      const trimmed = line.trim();
      if (!trimmed) return line;
      const abs = resolveUrl(trimmed, baseUrl);
      if (/\.ts(\?|$)/i.test(trimmed)) return abs;
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

// ─── Proxy classique (pour les variantes master playlist) ─────────────────

async function proxyFetch(
  url: string,
  sessionCookies: string,
  range: string | null,
): Promise<NextResponse> {
  const origin = new URL(url).origin;
  const reqHeaders: Record<string, string> = {
    "User-Agent": IPTV_UA,
    Accept: "*/*",
    Connection: "keep-alive",
    "Accept-Encoding": "gzip, deflate",
    Referer: `${origin}/`,
  };
  if (sessionCookies) reqHeaders["Cookie"] = sessionCookies;
  if (range) reqHeaders["Range"] = range;

  let upstream: Response;
  try {
    upstream = await fetch(url, { headers: reqHeaders, cache: "no-store", redirect: "follow" });
  } catch (err) {
    console.error("[HLS proxy] fetch error:", err);
    return NextResponse.json({ error: "Réseau" }, { status: 502 });
  }

  if (!upstream.ok) {
    const buf = await upstream.arrayBuffer().catch(() => new ArrayBuffer(0));
    const bodyText = new TextDecoder().decode(buf).substring(0, 500);
    console.error(
      `\n[HLS proxy] ❌ ${upstream.status} ${upstream.statusText}\n` +
      `  URL    : ${url}\n` +
      `  Headers envoyés : ${JSON.stringify(reqHeaders)}\n` +
      `  Headers reçus   : ${JSON.stringify(Object.fromEntries(upstream.headers.entries()))}\n` +
      `  Bytes reçus     : ${buf.byteLength}\n` +
      `  Body texte (500c): ${bodyText || "(vide ou non-textuel)"}\n`,
    );
    return NextResponse.json(
      { error: `IPTV ${upstream.status}` },
      { status: upstream.status },
    );
  }

  const ct = upstream.headers.get("Content-Type") ?? "";
  const isPlaylist =
    ct.includes("mpegurl") || ct.includes("m3u8") || url.includes(".m3u8");

  if (isPlaylist) {
    const freshCookies = extractCookies(upstream.headers);
    const mergedCookies = mergeCookies(sessionCookies, freshCookies);

    console.log(`[HLS proxy] ✅ Playlist ${url}`);

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

// ─── Route handler ────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const range = req.headers.get("range");

  // Proxy direct (pour les variantes master playlist)
  const proxyUrl = searchParams.get("proxyUrl");
  if (proxyUrl) {
    const cookies = searchParams.get("ck") ?? "";
    return proxyFetch(decodeURIComponent(proxyUrl), cookies, range);
  }

  // Re-stream ffmpeg
  const streamId = searchParams.get("streamId");
  if (streamId) {
    const r = await requireCreds();
    if (r instanceof NextResponse) return r;

    const inputUrl = iptv.liveUrl(r.creds, streamId);
    startFfmpeg(streamId, inputUrl);

    const playlistPath = join(HLS_DIR, streamId, "stream.m3u8");
    const ready = await waitForFile(playlistPath);
    if (!ready) {
      return NextResponse.json(
        { error: "Timeout: ffmpeg n'a pas produit de playlist" },
        { status: 504 },
      );
    }

    // Retourner la playlist re-streamée avec les segments routés via le proxy
    const raw = readFileSync(playlistPath, "utf-8");
    const content = raw.replace(
      /^(seg_\d+\.ts)$/gm,
      (_, seg) => `/api/live/hls?segment=${encodeURIComponent(streamId + "/" + seg)}`,
    );
    return new NextResponse(content, {
      headers: {
        "Content-Type": "application/vnd.apple.mpegurl",
        "Cache-Control": "no-cache, no-store",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  // Servir un segment re-streamé
  const segment = searchParams.get("segment");
  if (segment) {
    if (segment.includes("..")) {
      return NextResponse.json({ error: "Chemin invalide" }, { status: 400 });
    }
    const segPath = join(HLS_DIR, segment);
    if (!existsSync(segPath)) {
      return NextResponse.json({ error: "Segment introuvable" }, { status: 404 });
    }
    const data = readFileSync(segPath);
    return new NextResponse(data, {
      headers: {
        "Content-Type": "video/MP2T",
        "Cache-Control": "no-cache, no-store",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  // Heartbeat — le client ping pour dire qu'il regarde encore
  const heartbeat = searchParams.get("heartbeat");
  if (heartbeat) {
    lastHeartbeat.set(heartbeat, Date.now());
    return NextResponse.json({ ok: true });
  }

  // Stop explicite — le client quitte la lecture
  const stop = searchParams.get("stop");
  if (stop) {
    stopFfmpeg(stop);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "streamId, segment, heartbeat ou stop requis" }, { status: 400 });
}
