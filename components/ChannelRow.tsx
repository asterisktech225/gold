"use client";
import Image from "next/image";
import { Play } from "lucide-react";
import { clsx } from "clsx";

interface Props {
  name: string;
  logo?: string;
  active?: boolean;
  epgTitle?: string;
  onClick: () => void;
}

export default function ChannelRow({ name, logo, active, epgTitle, onClick }: Props) {
  return (
    <button onClick={onClick}
      className={clsx("flex items-center gap-3 w-full px-3 py-2 rounded-lg transition-colors text-left",
        active ? "bg-accent text-white" : "hover:bg-surface-2 text-white/80 hover:text-white"
      )}>
      <div className="w-10 h-10 shrink-0 relative rounded bg-surface flex items-center justify-center overflow-hidden">
        {logo
          ? <Image src={logo} alt={name} fill className="object-contain p-1" unoptimized />
          : <Play size={14} className="text-white/40" />
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{name}</p>
        {epgTitle && <p className="text-xs text-white/50 truncate">{epgTitle}</p>}
      </div>
    </button>
  );
}
