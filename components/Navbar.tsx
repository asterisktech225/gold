"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Tv, Film, Clapperboard, Heart, LogOut, Settings } from "lucide-react";
import { clsx } from "clsx";

const NAV = [
  { href: "/live",      label: "Live TV",  icon: Tv },
  { href: "/movies",    label: "Films",    icon: Film },
  { href: "/series",    label: "Séries",   icon: Clapperboard },
  { href: "/favorites", label: "Favoris",  icon: Heart },
  { href: "/settings",  label: "Réglages", icon: Settings },
];


export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <nav className="fixed top-0 inset-x-0 z-50 h-16 bg-surface border-b border-white/10 flex items-center px-6 gap-8">
      <span className="text-accent font-bold text-xl tracking-tight mr-4">▶ IPTV</span>
      <div className="flex gap-1 flex-1">
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href}
            className={clsx("flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
              pathname.startsWith(href)
                ? "bg-accent text-white"
                : "text-white/60 hover:text-white hover:bg-white/10"
            )}>
            <Icon size={16} /> {label}
          </Link>
        ))}
      </div>
      <button onClick={logout}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/10 transition-colors">
        <LogOut size={16} /> Déconnexion
      </button>
    </nav>
  );
}
