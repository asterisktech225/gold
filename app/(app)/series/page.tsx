"use client";
import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import MediaCard from "@/components/MediaCard";
import Player from "@/components/Player";
import { ChevronLeft } from "lucide-react";

type View = "list" | "detail";

export default function SeriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [catId, setCatId] = useState<string | null>(null);
  const [seriesList, setSeriesList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<View>("list");
  const [detail, setDetail] = useState<any | null>(null);
  const [season, setSeason] = useState<string | null>(null);
  const [player, setPlayer] = useState<{ url: string; title: string } | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/series/categories").then(r => r.json()).then(setCategories);
  }, []);

  useEffect(() => {
    if (!catId) return;
    setLoading(true);
    fetch(`/api/series/list?categoryId=${catId}`)
      .then(r => r.json())
      .then(data => { setSeriesList(data); setLoading(false); });
  }, [catId]);

  async function openSeries(s: any) {
    const r = await fetch(`/api/series/info?seriesId=${s.series_id}`);
    const data = await r.json();
    setDetail(data);
    setSeason(null);
    setView("detail");
  }

  async function playEpisode(ep: any) {
    const ext = ep.container_extension ?? "mp4";
    const url = `/api/series/proxy?streamId=${ep.id}&ext=${ext}`;
    setPlayer({ url, title: ep.title ?? ep.id });
  }

  const filtered = seriesList.filter(s => s.name?.toLowerCase().includes(search.toLowerCase()));
  const seasons: Record<string, any[]> = detail?.episodes ?? {};
  const currentEpisodes = season ? seasons[season] ?? [] : [];

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      <div className="w-56 border-r border-white/10 overflow-y-auto p-3">
        <Sidebar categories={categories} selected={catId}
          onSelect={id => { setCatId(id); setView("list"); setDetail(null); }} />
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center gap-3">
          {view === "detail" && (
            <button onClick={() => { setView("list"); setDetail(null); setPlayer(null); }}
              className="flex items-center gap-1 text-sm text-white/60 hover:text-white transition-colors">
              <ChevronLeft size={16} /> Retour
            </button>
          )}
          {view === "list" && (
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher une série..."
              className="w-full max-w-sm bg-surface-2 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
          )}
          {view === "detail" && detail && (
            <h2 className="text-lg font-semibold">{detail.info?.name}</h2>
          )}
        </div>

        {/* Player inline */}
        {player && (
          <div className="p-4 border-b border-white/10">
            <Player url={player.url} title={player.title} onClose={() => setPlayer(null)} />
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4">
          {view === "list" && (
            loading
              ? <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-3">
                  {Array.from({ length: 14 }).map((_, i) => <div key={i} className="aspect-[2/3] rounded-xl bg-surface-2 animate-pulse" />)}
                </div>
              : <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-3">
                  {filtered.map(s => (
                    <MediaCard key={s.series_id} name={s.name} cover={s.cover} onClick={() => openSeries(s)} />
                  ))}
                </div>
          )}

          {view === "detail" && detail && (
            <div>
              {/* Sélection saison */}
              <div className="flex gap-2 mb-4 flex-wrap">
                {Object.keys(seasons).map(s => (
                  <button key={s} onClick={() => setSeason(s)}
                    className={`px-4 py-1.5 rounded-full text-sm transition-colors ${season === s ? "bg-accent text-white" : "bg-surface-2 text-white/70 hover:text-white"}`}>
                    Saison {s}
                  </button>
                ))}
              </div>

              {/* Liste épisodes */}
              {currentEpisodes.length > 0 && (
                <div className="space-y-2">
                  {currentEpisodes.map((ep: any) => (
                    <button key={ep.id} onClick={() => playEpisode(ep)}
                      className="w-full flex items-center gap-3 px-4 py-3 bg-surface-2 hover:bg-accent/20 rounded-xl transition-colors text-left">
                      <span className="text-white/40 text-sm w-8 shrink-0">E{ep.episode_num}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{ep.title ?? `Épisode ${ep.episode_num}`}</p>
                        {ep.info?.plot && <p className="text-xs text-white/40 truncate mt-0.5">{ep.info.plot}</p>}
                      </div>
                      {ep.info?.duration && <span className="text-xs text-white/40 shrink-0">{ep.info.duration}</span>}
                    </button>
                  ))}
                </div>
              )}
              {season && currentEpisodes.length === 0 && (
                <p className="text-white/30 text-sm">Aucun épisode disponible</p>
              )}
              {!season && <p className="text-white/30 text-sm">← Sélectionnez une saison</p>}
            </div>
          )}

          {!catId && view === "list" && !loading && (
            <p className="text-white/30 text-sm text-center mt-12">← Sélectionnez une catégorie</p>
          )}
        </div>
      </div>
    </div>
  );
}
