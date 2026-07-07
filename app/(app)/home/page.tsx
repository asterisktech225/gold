"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import Player from "@/components/Player";
import { Tv, Film, Clapperboard, Play } from "lucide-react";

const TYPE_META: Record<string, { label: string; icon: any }> = {
  live:   { label: "Dernière chaîne", icon: Tv },
  movie:  { label: "Dernier film",    icon: Film },
  series: { label: "Dernière série",  icon: Clapperboard },
};

export default function HomePage() {
  const [history, setHistory] = useState<Record<string, any> | null>(null);
  const [player, setPlayer] = useState<{ url: string; title: string; isLive?: boolean } | null>(null);

  useEffect(() => {
    fetch("/api/history").then(r => r.json()).then(setHistory).catch(() => setHistory({}));
  }, []);

  async function resume(item: any) {
    if (item.type === "live") {
      let url: string | undefined;
      try {
        const r = await fetch(`/api/live/url?streamId=${item.stream_id}`);
        ({ url } = await r.json());
      } catch { return; }
      if (!url) return;
      setPlayer({ url, title: item.name, isLive: true });
    } else if (item.type === "movie") {
      const ext = item.data?.ext ?? "mp4";
      setPlayer({ url: `/api/movies/proxy?streamId=${item.stream_id}&ext=${ext}`, title: item.name });
    } else {
      const epId = item.data?.epId ?? item.stream_id;
      const ext = item.data?.ext ?? "mp4";
      setPlayer({ url: `/api/series/proxy?streamId=${epId}&ext=${ext}`, title: item.name });
    }
  }

  const items = history
    ? ["live", "movie", "series"].map(t => history[t] ? { ...history[t], type: t } : null).filter(Boolean)
    : [];

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-xl font-bold mb-1">Reprendre là où vous en étiez</h1>
      <p className="text-sm text-white/40 mb-6">Vos derniers contenus regardés</p>

      {player && (
        <div className="mb-6">
          <Player url={player.url} title={player.title} isLive={player.isLive} onClose={() => setPlayer(null)} />
        </div>
      )}

      {history === null && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-48 rounded-xl bg-surface-2 animate-pulse" />)}
        </div>
      )}

      {history !== null && items.length === 0 && (
        <div className="text-center text-white/30 mt-16">
          <p className="mb-4">Aucun historique pour le moment.</p>
          <div className="flex justify-center gap-3">
            <Link href="/live" className="px-4 py-2 rounded-lg bg-surface-2 text-white/70 hover:text-white text-sm">Live TV</Link>
            <Link href="/movies" className="px-4 py-2 rounded-lg bg-surface-2 text-white/70 hover:text-white text-sm">Films</Link>
            <Link href="/series" className="px-4 py-2 rounded-lg bg-surface-2 text-white/70 hover:text-white text-sm">Séries</Link>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {items.map((item: any) => {
          const meta = TYPE_META[item.type];
          return (
            <button key={item.type} onClick={() => resume(item)}
              className="group relative rounded-xl overflow-hidden bg-surface-2 hover:ring-2 hover:ring-accent transition-all text-left">
              <div className="aspect-video w-full relative bg-surface">
                {item.cover
                  ? <Image src={item.cover} alt={item.name} fill className="object-cover" unoptimized />
                  : <div className="absolute inset-0 flex items-center justify-center text-white/20"><meta.icon size={40} /></div>
                }
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Play size={40} className="text-white drop-shadow" />
                </div>
              </div>
              <div className="p-3">
                <p className="text-xs text-accent flex items-center gap-1.5 mb-1"><meta.icon size={12} /> {meta.label}</p>
                <p className="text-sm text-white/90 font-medium truncate">{item.name}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
