import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { requireCreds } from "@/lib/api-helpers";
import { iptv } from "@/lib/iptv";

const IPTV_UA = "Lavf/60.16.100";

interface Chapter { start: number; end: number; title: string }
interface ProbeResult { duration: number | null; chapters: Chapter[]; creditsStart: number | null }

// Cache en mémoire : un épisode ne change pas, inutile de re-sonder à chaque lecture.
const cache = new Map<string, ProbeResult>();

function ffprobe(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    execFile(
      "ffprobe",
      [
        "-v", "quiet",
        "-user_agent", IPTV_UA,
        "-print_format", "json",
        "-show_chapters",
        "-show_format",
        url,
      ],
      { timeout: 20000, maxBuffer: 4 * 1024 * 1024 },
      (err, stdout) => {
        if (err) return reject(err);
        try { resolve(JSON.parse(stdout)); } catch (e) { reject(e); }
      }
    );
  });
}

/** Repère le chapitre qui correspond au générique de fin. */
function findCreditsStart(chapters: Chapter[], duration: number | null): number | null {
  if (chapters.length === 0) return null;

  const byName = chapters.find(c => /credit|g[ée]n[ée]rique|outro|ending|\bED\b/i.test(c.title));
  if (byName) return byName.start;

  // Sinon : dernier chapitre, s'il est court et démarre dans les derniers 15% du fichier.
  if (duration) {
    const last = chapters[chapters.length - 1];
    if (last.start > duration * 0.85 && last.end - last.start < 300) return last.start;
  }
  return null;
}

export async function GET(req: NextRequest) {
  const r = await requireCreds();
  if (r instanceof NextResponse) return r;

  const streamId = req.nextUrl.searchParams.get("streamId") ?? "";
  const ext = req.nextUrl.searchParams.get("ext") ?? "mp4";
  if (!streamId) return NextResponse.json({ error: "streamId manquant" }, { status: 400 });

  const cached = cache.get(streamId);
  if (cached) return NextResponse.json(cached);

  const url = iptv.episodeUrl(r.creds, streamId, ext);

  let result: ProbeResult;
  try {
    const probe = await ffprobe(url);
    const duration = probe.format?.duration ? parseFloat(probe.format.duration) : null;
    const chapters: Chapter[] = (probe.chapters ?? []).map((c: any) => ({
      start: parseFloat(c.start_time),
      end: parseFloat(c.end_time),
      title: c.tags?.title ?? "",
    }));
    result = { duration, chapters, creditsStart: findCreditsStart(chapters, duration) };
  } catch {
    // ffprobe absent, timeout ou flux illisible : le lecteur retombera sur l'heuristique.
    result = { duration: null, chapters: [], creditsStart: null };
  }

  cache.set(streamId, result);
  return NextResponse.json(result);
}
