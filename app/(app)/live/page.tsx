"use client";
import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import ChannelRow from "@/components/ChannelRow";
import Player from "@/components/Player";

export default function LivePage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [catId, setCatId] = useState<string | null>(null);
  const [channels, setChannels] = useState<any[]>([]);
  const [active, setActive] = useState<any | null>(null);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [loadingCat, setLoadingCat] = useState(false);
  const [epg, setEpg] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/live/categories").then(r => r.json()).then(setCategories);
  }, []);

  useEffect(() => {
    if (!catId) return;
    setLoadingCat(true);
    fetch(`/api/live/streams?categoryId=${catId}`)
      .then(r => r.json())
      .then(data => { setChannels(data); setLoadingCat(false); });
  }, [catId]);

  async function playChannel(ch: any) {
    setActive(ch);
    const r = await fetch(`/api/live/url?streamId=${ch.stream_id}`);
    const { url } = await r.json();
    setStreamUrl(url);
    // Charge l'EPG en arrière-plan
    fetch(`/api/epg?streamId=${ch.stream_id}`)
      .then(r => r.json())
      .then(data => {
        const prog = data?.epg_listings?.[0];
        if (prog) setEpg(e => ({ ...e, [ch.stream_id]: prog.title }));
      }).catch(() => {});
  }

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Sidebar catégories */}
      <div className="w-56 border-r border-white/10 overflow-y-auto p-3">
        <Sidebar categories={categories} selected={catId} onSelect={setCatId} />
      </div>

      {/* Liste des chaînes */}
      <div className="w-72 border-r border-white/10 flex flex-col">
        <div className="p-3 border-b border-white/10">
          <input
            type="text"
            placeholder="Rechercher une chaîne..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-white/30"
          />
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {loadingCat
            ? Array.from({ length: 12 }).map((_, i) => <div key={i} className="h-12 rounded-lg bg-surface-2 animate-pulse" />)
            : channels
                .filter(ch => ch.name.toLowerCase().includes(search.toLowerCase()))
                .map(ch => (
                  <ChannelRow key={ch.stream_id} name={ch.name} logo={ch.stream_icon}
                    active={active?.stream_id === ch.stream_id}
                    epgTitle={epg[ch.stream_id]}
                    onClick={() => playChannel(ch)} />
                ))
          }
          {!catId && !loadingCat && (
            <p className="text-white/30 text-sm text-center mt-8">← Sélectionnez une catégorie</p>
          )}
        </div>
      </div>

      {/* Player */}
      <div className="flex-1 flex items-center justify-center p-6 bg-bg">
        {streamUrl
          ? <div className="w-full max-w-4xl">
              <Player url={streamUrl} title={active?.name} isLive />
              {epg[active?.stream_id] && (
                <p className="mt-3 text-sm text-white/50 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  En direct : {epg[active?.stream_id]}
                </p>
              )}
            </div>
          : <div className="text-center text-white/20">
              <div className="text-6xl mb-4">📺</div>
              <p>Sélectionnez une chaîne pour commencer</p>
            </div>
        }
      </div>
    </div>
  );
}
