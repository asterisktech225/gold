"use client";
import { useState, useEffect, useRef } from "react";
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
  const [player, setPlayer] = useState<{ url: string; title: string; epId: string; season: string; creditsStart?: number | null } | null>(null);
  const [search, setSearch] = useState("");
  const [globalResults, setGlobalResults] = useState<any[] | null>(null);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    fetch("/api/series/categories")
      .then(r => r.json())
      .then(data => setCategories(Array.isArray(data) ? data : []))
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    if (!catId) return;
    setLoading(true);
    setGlobalResults(null);
    fetch(`/api/series/list?categoryId=${catId}`)
      .then(r => r.json())
      .then(data => { setSeriesList(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => { setSeriesList([]); setLoading(false); });
  }, [catId]);

  // Recherche globale
  useEffect(() => {
    if (catId || view !== "list") return;
    if (search.trim().length < 2) { setGlobalResults(null); return; }

    clearTimeout(debounceRef.current);
    setSearching(true);
    debounceRef.current = setTimeout(() => {
      fetch(`/api/series/search?q=${encodeURIComponent(search)}`)
        .then(r => r.json())
        .then(data => { setGlobalResults(Array.isArray(data) ? data : []); setSearching(false); })
        .catch(() => setSearching(false));
    }, 400);
  }, [search, catId, view]);

  async function openSeries(s: any) {
    let data: any;
    try {
      const r = await fetch(`/api/series/info?seriesId=${s.series_id}`);
      data = await r.json();
      if (!r.ok) throw new Error(data?.error);
    } catch {
      return; // serveur IPTV inaccessible, on reste sur la liste
    }
    setDetail({ ...data, seriesId: s.series_id, seriesName: s.name, seriesCover: s.cover });
    setSeason(null);
    setView("detail");
  }

  function episodeLabel(ep: any, s: string) {
    return ep.title ?? `S${s} E${ep.episode_num}`;
  }

  function playEpisode(ep: any, s?: string | null) {
    const epSeason = s ?? season;
    if (!epSeason) return;
    const epId = String(ep.id);
    const ext = ep.container_extension ?? "mp4";
    const url = `/api/series/proxy?streamId=${ep.id}&ext=${ext}`;
    setPlayer({ url, title: episodeLabel(ep, epSeason), epId, season: epSeason });

    // Historique "reprendre" : on garde la série + l'épisode exact
    if (detail?.seriesId) {
      fetch("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "series",
          streamId: detail.seriesId,
          name: `${detail.seriesName ?? detail.info?.name ?? "Série"} — ${episodeLabel(ep, epSeason)}`,
          cover: detail.info?.cover ?? detail.seriesCover,
          data: { epId, ext, season: epSeason },
        }),
      }).catch(() => {});
    }

    // Chapitrage (ffprobe) en arrière-plan : si le fichier marque le générique de fin,
    // l'overlay "épisode suivant" se déclenchera au bon moment.
    fetch(`/api/series/chapters?streamId=${ep.id}&ext=${ext}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.creditsStart == null) return;
        setPlayer(p => p && p.epId === epId ? { ...p, creditsStart: data.creditsStart } : p);
      })
      .catch(() => {});
  }

  const filtered = catId
    ? seriesList.filter(s => s.name?.toLowerCase().includes(search.toLowerCase()))
    : globalResults ?? [];

  const seasons: Record<string, any[]> = detail?.episodes ?? {};
  const currentEpisodes = season ? seasons[season] ?? [] : [];

  // Épisode suivant de celui en cours de lecture (saison suivante si fin de saison)
  function findNextEpisode(): { ep: any; season: string } | null {
    if (!player) return null;
    const keys = Object.keys(seasons).sort((a, b) => Number(a) - Number(b));
    const list = seasons[player.season] ?? [];
    const idx = list.findIndex((e: any) => String(e.id) === player.epId);
    if (idx === -1) return null;
    if (idx + 1 < list.length) return { ep: list[idx + 1], season: player.season };
    const sIdx = keys.indexOf(player.season);
    for (let i = sIdx + 1; i < keys.length; i++) {
      if (seasons[keys[i]]?.length) return { ep: seasons[keys[i]][0], season: keys[i] };
    }
    return null;
  }

  const nextEp = findNextEpisode();

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      <div className="w-56 border-r border-white/10 overflow-y-auto p-3">
        <Sidebar categories={categories} selected={catId}
          onSelect={id => { setCatId(id); setView("list"); setDetail(null); setGlobalResults(null); }} />
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
              placeholder={catId ? "Filtrer dans la categorie..." : "Rechercher dans toutes les series..."}
              className="w-full max-w-sm bg-surface-2 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
          )}
          {view === "detail" && detail && (
            <h2 className="text-lg font-semibold">{detail.info?.name}</h2>
          )}
        </div>

        {view === "detail" && detail ? (
          /* Vue détail : lecteur à gauche, épisodes à droite */
          <div className="flex-1 flex flex-col lg:flex-row min-h-0">
            {player && (
              <div className="flex-1 min-w-0 p-4 overflow-y-auto">
                <Player
                  url={player.url}
                  title={player.title}
                  onClose={() => setPlayer(null)}
                  onNext={nextEp ? () => playEpisode(nextEp.ep, nextEp.season) : undefined}
                  nextTitle={nextEp ? episodeLabel(nextEp.ep, nextEp.season) : undefined}
                  creditsStart={player.creditsStart}
                />
              </div>
            )}

            <div className={`${player ? "lg:w-[26rem] lg:shrink-0 lg:border-l border-t lg:border-t-0 border-white/10" : "flex-1"} overflow-y-auto p-4`}>
              <div className="flex gap-2 mb-4 flex-wrap">
                {Object.keys(seasons).map(s => (
                  <button key={s} onClick={() => setSeason(s)}
                    className={`px-4 py-1.5 rounded-full text-sm transition-colors ${season === s ? "bg-accent text-white" : "bg-surface-2 text-white/70 hover:text-white"}`}>
                    Saison {s}
                  </button>
                ))}
              </div>

              {currentEpisodes.length > 0 && (
                <div className="space-y-2">
                  {currentEpisodes.map((ep: any) => {
                    const isPlaying = player?.epId === String(ep.id);
                    return (
                      <button key={ep.id} onClick={() => playEpisode(ep)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-left ${isPlaying ? "bg-accent/20 ring-1 ring-accent" : "bg-surface-2 hover:bg-accent/20"}`}>
                        <span className={`text-sm w-8 shrink-0 ${isPlaying ? "text-accent font-semibold" : "text-white/40"}`}>E{ep.episode_num}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{ep.title ?? `Episode ${ep.episode_num}`}</p>
                          {ep.info?.plot && <p className="text-xs text-white/40 truncate mt-0.5">{ep.info.plot}</p>}
                        </div>
                        {ep.info?.duration && <span className="text-xs text-white/40 shrink-0">{ep.info.duration}</span>}
                      </button>
                    );
                  })}
                </div>
              )}
              {season && currentEpisodes.length === 0 && (
                <p className="text-white/30 text-sm">Aucun episode disponible</p>
              )}
              {!season && <p className="text-white/30 text-sm">Selectionnez une saison</p>}
            </div>
          </div>
        ) : (
          /* Vue liste */
          <div className="flex-1 overflow-y-auto p-4">
            {(loading || searching)
              ? <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-3">
                  {Array.from({ length: 14 }).map((_, i) => <div key={i} className="aspect-[2/3] rounded-xl bg-surface-2 animate-pulse" />)}
                </div>
              : <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-3">
                  {filtered.map(s => (
                    <MediaCard key={s.series_id} name={s.name} cover={s.cover} onClick={() => openSeries(s)} />
                  ))}
                </div>
            }
            {!catId && !loading && !search && (
              <p className="text-white/30 text-sm text-center mt-12">Selectionnez une categorie ou recherchez une serie</p>
            )}
            {!loading && !searching && filtered.length === 0 && (search || (!catId && globalResults)) && (
              <p className="text-white/30 text-sm text-center mt-12">Aucun resultat pour "{search}"</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
