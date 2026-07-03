"use client";
import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import MediaCard from "@/components/MediaCard";
import Player from "@/components/Player";
import { X } from "lucide-react";

export default function MoviesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [catId, setCatId] = useState<string | null>(null);
  const [movies, setMovies] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [player, setPlayer] = useState<{ url: string; title: string } | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/movies/categories").then(r => r.json()).then(setCategories);
  }, []);

  useEffect(() => {
    if (!catId) return;
    setLoading(true);
    fetch(`/api/movies/streams?categoryId=${catId}`)
      .then(r => r.json())
      .then(data => { setMovies(data); setLoading(false); });
  }, [catId]);

  async function playMovie(m: any) {
    const ext = m.container_extension ?? "mp4";
    const url = `/api/movies/proxy?streamId=${m.stream_id}&ext=${ext}`;
    setPlayer({ url, title: m.name });
  }

  const filtered = movies.filter(m => m.name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      <div className="w-56 border-r border-white/10 overflow-y-auto p-3">
        <Sidebar categories={categories} selected={catId} onSelect={setCatId} />
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        {/* Barre de recherche */}
        <div className="p-4 border-b border-white/10">
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un film..."
            className="w-full max-w-sm bg-surface-2 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
        </div>

        {/* Player inline */}
        {player && (
          <div className="p-4 border-b border-white/10 relative">
            <Player url={player.url} title={player.title} onClose={() => setPlayer(null)} />
          </div>
        )}

        {/* Grille films */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading
            ? <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-3">
                {Array.from({ length: 14 }).map((_, i) => <div key={i} className="aspect-[2/3] rounded-xl bg-surface-2 animate-pulse" />)}
              </div>
            : <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-3">
                {filtered.map(m => (
                  <MediaCard key={m.stream_id} name={m.name} cover={m.stream_icon}
                    badge={m.rating ? `⭐ ${m.rating}` : undefined}
                    onClick={() => playMovie(m)} />
                ))}
              </div>
          }
          {!catId && !loading && (
            <p className="text-white/30 text-sm text-center mt-12">← Sélectionnez une catégorie</p>
          )}
        </div>
      </div>
    </div>
  );
}
