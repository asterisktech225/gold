"use client";
import Image from "next/image";
import { Play } from "lucide-react";

interface Props {
  name: string;
  cover?: string;
  badge?: string;
  onClick: () => void;
}

export default function MediaCard({ name, cover, badge, onClick }: Props) {
  return (
    <button onClick={onClick}
      className="group relative rounded-xl overflow-hidden bg-surface-2 hover:ring-2 hover:ring-accent transition-all text-left">
      <div className="aspect-[2/3] w-full relative bg-surface">
        {cover
          ? <Image src={cover} alt={name} fill className="object-cover" unoptimized />
          : <div className="absolute inset-0 flex items-center justify-center text-white/20 text-4xl">▶</div>
        }
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Play size={40} className="text-white drop-shadow" />
        </div>
        {badge && <span className="absolute top-2 right-2 bg-accent text-white text-xs px-2 py-0.5 rounded-full">{badge}</span>}
      </div>
      <div className="p-2">
        <p className="text-xs text-white/80 truncate font-medium">{name}</p>
      </div>
    </button>
  );
}
