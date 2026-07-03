"use client";
import { clsx } from "clsx";

interface Category { category_id: string; category_name: string; }

interface Props {
  categories: Category[];
  selected: string | null;
  onSelect: (id: string) => void;
  loading?: boolean;
}

export default function Sidebar({ categories, selected, onSelect, loading }: Props) {
  if (loading) return (
    <div className="w-56 shrink-0 space-y-2 pt-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-8 rounded bg-surface-2 animate-pulse" />
      ))}
    </div>
  );

  return (
    <aside className="w-56 shrink-0 overflow-y-auto pr-2 space-y-1">
      {categories.map(c => (
        <button key={c.category_id} onClick={() => onSelect(c.category_id)}
          className={clsx("w-full text-left px-3 py-2 rounded-lg text-sm transition-colors truncate",
            selected === c.category_id
              ? "bg-accent text-white font-medium"
              : "text-white/70 hover:bg-surface-2 hover:text-white"
          )}>
          {c.category_name}
        </button>
      ))}
    </aside>
  );
}
