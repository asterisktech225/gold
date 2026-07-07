"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Tv } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ server: "", username: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setLoading(false);
    if (res.ok) { router.push("/home"); router.refresh(); }
    else { const d = await res.json(); setError(d.error ?? "Erreur inconnue"); }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm bg-surface rounded-2xl p-8 shadow-2xl border border-white/10">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-accent rounded-2xl flex items-center justify-center mb-4">
            <Tv size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold">Gold TV</h1>
          <p className="text-white/50 text-sm mt-1">Connectez-vous à votre service</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {[
            { key: "server",   label: "Serveur",        placeholder: "http://server:port", type: "url" },
            { key: "username", label: "Nom d'utilisateur", placeholder: "username",       type: "text" },
            { key: "password", label: "Mot de passe",    placeholder: "password",         type: "password" },
          ].map(({ key, label, placeholder, type }) => (
            <div key={key}>
              <label className="block text-sm text-white/70 mb-1">{label}</label>
              <input type={type} placeholder={placeholder} required
                value={(form as any)[key]}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                className="w-full bg-surface-2 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-accent transition" />
            </div>
          ))}

          {error && <p className="text-red-400 text-sm bg-red-400/10 rounded-lg px-3 py-2">{error}</p>}

          <button type="submit" disabled={loading}
            className="w-full bg-accent hover:bg-accent-hover disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2">
            {loading
              ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : "Se connecter"
            }
          </button>
        </form>
      </div>
    </div>
  );
}
