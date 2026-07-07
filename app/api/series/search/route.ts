import { NextRequest, NextResponse } from "next/server";
import { requireCreds } from "@/lib/api-helpers";
import { iptv } from "@/lib/iptv";

const CONCURRENCY = 5;

export async function GET(req: NextRequest) {
  const r = await requireCreds();
  if (r instanceof NextResponse) return r;

  const q = (req.nextUrl.searchParams.get("q") ?? "").toLowerCase().trim();
  if (!q) return NextResponse.json([]);

  let cats: any[];
  try {
    cats = await iptv.seriesCategories(r.creds);
    if (!Array.isArray(cats)) throw new Error("bad response");
  } catch {
    return NextResponse.json({ error: "Serveur IPTV inaccessible" }, { status: 502 });
  }
  const results: any[] = [];

  for (let i = 0; i < cats.length; i += CONCURRENCY) {
    const batch = cats.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(
      batch.map(async (cat) => {
        try {
          const streams: any[] = await iptv.series(r.creds, cat.category_id);
          return streams.filter((s: any) => s.name?.toLowerCase().includes(q));
        } catch {
          return [];
        }
      }),
    );
    for (const r of batchResults) results.push(...r);
    if (results.length >= 50) break;
  }

  return NextResponse.json(results.slice(0, 50));
}
