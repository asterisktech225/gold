"use client";
import { useState } from "react";
import { Heart } from "lucide-react";
import { clsx } from "clsx";

interface Props {
  type: "live" | "movie" | "series";
  streamId: string;
  name: string;
  cover?: string;
  initial?: boolean;
}

export default function FavoriteButton({ type, streamId, name, cover, initial = false }: Props) {
  const [fav, setFav] = useState(initial);

  async function toggle() {
    const next = !fav;
    setFav(next);
    await fetch("/api/favorites", {
      method: next ? "POST" : "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, streamId, name, cover }),
    });
  }

  return (
    <button onClick={e => { e.stopPropagation(); toggle(); }}
      className={clsx("transition-colors", fav ? "text-red-400" : "text-white/30 hover:text-red-400")}>
      <Heart size={16} fill={fav ? "currentColor" : "none"} />
    </button>
  );
}
