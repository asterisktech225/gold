"use client";
import { useState, useEffect } from "react";
import MediaCard from "@/components/MediaCard";
import Player from "@/components/Player";
import { Heart } from "lucide-react";

export default function FavoritesPage() {
  const [favs, setFavs] = useState<any[]>([]);
  const [player, setPlayer] = useState<{ url: string; title: string; isLive?: boolean } | null>(null);

  useEffect(() => {
    fetch("/api/favorites").then(r => r.json()).then(setFavs);
  }, []);

  async function playFav(f: any) {
    let endpoint = "";
    if (f.type === "live")   endpoint = `/api/live/url?streamId=${f.stream_id}`;
    if (f.type === "movie")  endpoint = `/api/movies/url?streamId=${f.stream_id}`;
    if (f.type === "series") endpoint = `/api/series/url?streamId=${f.stream_id}`;
    const r = await fetch(endpoint);
    const { url } = await r.json();
    setPlayer({ url, title: f.name, isLive: f.type === "live" });
  }

  const grouped = { live: favs.filter(f => f.type === "live"), movie: favs.filter(f => f.type === "movie"), series: favs.filter(f => f.type === "series") };
  const labels: Record<string, string> = { live: "📺 Chaînes Live", movie: "🎬 Films", series: "📺 Séries" };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2"><Heart size={22} className="text-red-400" /> Mes favoris</h1>

      {player && (
        <div className="mb-6">
          <Player url={player.url} title={player.title} isLive={player.isLive} onClose={() => setPlayer(null)} />
        </div>
      )}

      {favs.length === 0 && (
        <p className="text-white/30 text-center mt-12">Aucun favori pour l'instant.</p>
      )}

      {(["live", "movie", "series"] as const).map(type => grouped[type].length > 0 && (
        <section key={type} className="mb-8">
          <h2 className="text-lg font-semibold mb-3">{labels[type]}</h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
            {grouped[type].map(f => (
              <MediaCard key={f.id} name={f.name} cover={f.cover} onClick={() => playFav(f)} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
