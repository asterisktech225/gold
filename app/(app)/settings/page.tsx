"use client";
import { useState, useEffect } from "react";
import { Save, ShieldAlert, Cpu, Check, HelpCircle } from "lucide-react";

const PREDEFINED_DNS = [
  { id: "system", label: "DNS Système (Par défaut)", ip: "" },
  { id: "cloudflare", label: "Cloudflare DNS", ip: "1.1.1.1" },
  { id: "google", label: "Google DNS", ip: "8.8.8.8" },
  { id: "adguard", label: "AdGuard DNS", ip: "94.140.14.14" },
];

export default function SettingsPage() {
  const [selectedDns, setSelectedDns] = useState("system");
  const [customIp, setCustomIp] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    // Load current setting from API
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        const currentDns = data.custom_dns || "";
        if (currentDns === "") {
          setSelectedDns("system");
        } else {
          const pre = PREDEFINED_DNS.find((d) => d.ip === currentDns);
          if (pre) {
            setSelectedDns(pre.id);
          } else {
            setSelectedDns("custom");
            setCustomIp(currentDns);
          }
        }
      })
      .catch((err) => {
        console.error("Failed to load settings:", err);
      });
  }, []);

  async function handleSave() {
    setSaving(true);
    setMessage(null);

    let targetIp = "";
    if (selectedDns === "custom") {
      targetIp = customIp.trim();
      // Simple IP validation (IPv4)
      const ipPattern = /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
      if (targetIp !== "" && !ipPattern.test(targetIp)) {
        setMessage({ type: "error", text: "Adresse IP DNS invalide. Veuillez entrer une adresse IPv4 valide (ex: 8.8.8.8)." });
        setSaving(false);
        return;
      }
    } else {
      const found = PREDEFINED_DNS.find((d) => d.id === selectedDns);
      targetIp = found ? found.ip : "";
    }

    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ custom_dns: targetIp }),
      });
      if (res.ok) {
        setMessage({ type: "success", text: "Configuration DNS mise à jour et appliquée avec succès !" });
      } else {
        const data = await res.json();
        setMessage({ type: "error", text: `Erreur: ${data.error || "Impossible de sauvegarder."}` });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: "Erreur réseau lors de la sauvegarde." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-white/90 to-white/70 bg-clip-text text-transparent">
          Réglages Réseau & Lecteur
        </h1>
        <p className="text-white/60 mt-2 text-sm">
          Gérez les paramètres avancés pour optimiser la connexion de votre application.
        </p>
      </div>

      <div className="bg-surface rounded-2xl border border-white/5 p-6 shadow-xl backdrop-blur-md">
        <div className="flex items-start gap-4 mb-6 pb-6 border-b border-white/5">
          <div className="p-3 bg-accent/10 rounded-xl text-accent">
            <Cpu size={24} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Résolution DNS Personnalisée</h2>
            <p className="text-white/50 text-sm mt-1">
              Contournez le blocage DNS imposé par certains Fournisseurs d&apos;Accès Internet (FAI) sur les serveurs IPTV.
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Grille des DNS prédéfinis */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {PREDEFINED_DNS.map((dnsItem) => (
              <button
                key={dnsItem.id}
                onClick={() => setSelectedDns(dnsItem.id)}
                className={`flex items-center justify-between p-4 rounded-xl border text-left transition-all ${
                  selectedDns === dnsItem.id
                    ? "bg-accent/10 border-accent text-white"
                    : "bg-surface-2/40 border-white/5 text-white/70 hover:bg-surface-2/80 hover:text-white"
                }`}
              >
                <div>
                  <div className="font-semibold text-sm">{dnsItem.label}</div>
                  <div className="text-xs text-white/40 mt-1">{dnsItem.ip || "Système par défaut"}</div>
                </div>
                {selectedDns === dnsItem.id && (
                  <div className="w-5 h-5 rounded-full bg-accent flex items-center justify-center text-white">
                    <Check size={12} strokeWidth={3} />
                  </div>
                )}
              </button>
            ))}

            <button
              onClick={() => setSelectedDns("custom")}
              className={`flex items-center justify-between p-4 rounded-xl border text-left transition-all ${
                selectedDns === "custom"
                  ? "bg-accent/10 border-accent text-white"
                  : "bg-surface-2/40 border-white/5 text-white/70 hover:bg-surface-2/80 hover:text-white"
              }`}
            >
              <div>
                <div className="font-semibold text-sm">DNS Personnalisé</div>
                <div className="text-xs text-white/40 mt-1">Saisir une adresse IP manuellement</div>
              </div>
              {selectedDns === "custom" && (
                <div className="w-5 h-5 rounded-full bg-accent flex items-center justify-center text-white">
                  <Check size={12} strokeWidth={3} />
                </div>
              )}
            </button>
          </div>

          {/* Champ d'adresse IP personnalisée */}
          {selectedDns === "custom" && (
            <div className="space-y-2 p-4 bg-surface-2/30 rounded-xl border border-white/5 animate-fadeIn">
              <label htmlFor="dns-ip" className="block text-xs font-semibold text-white/60">
                Adresse IP du serveur DNS
              </label>
              <input
                id="dns-ip"
                type="text"
                value={customIp}
                onChange={(e) => setCustomIp(e.target.value)}
                placeholder="Ex: 1.0.0.1 ou 9.9.9.9"
                className="w-full px-4 py-2.5 bg-surface border border-white/10 rounded-lg text-sm text-white placeholder-white/20 focus:outline-none focus:border-accent transition-colors"
              />
            </div>
          )}

          {/* Info Banner */}
          <div className="flex gap-3 p-4 bg-surface-2/50 rounded-xl border border-white/5 text-white/60 text-xs leading-relaxed">
            <HelpCircle size={16} className="shrink-0 text-accent" />
            <div>
              La modification du DNS sera appliquée en temps réel. Toutes les requêtes vers l&apos;API Xtream Codes ainsi que les playlists HLS/M3U8 de vos chaînes transiteront via ce résolveur DNS pour bypasser les filtrages de votre réseau.
            </div>
          </div>

          {/* Alert Message */}
          {message && (
            <div
              className={`flex gap-3 p-4 rounded-xl border text-sm animate-fadeIn ${
                message.type === "success"
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                  : "bg-rose-500/10 border-rose-500/20 text-rose-400"
              }`}
            >
              {message.type === "error" && <ShieldAlert size={18} className="shrink-0" />}
              {message.type === "success" && <Check size={18} className="shrink-0" />}
              <div>{message.text}</div>
            </div>
          )}

          {/* Action button */}
          <div className="flex justify-end pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-accent hover:bg-accent-hover disabled:bg-accent/50 text-white rounded-xl text-sm font-semibold transition-all shadow-lg hover:shadow-accent/20 active:scale-95 disabled:scale-100"
            >
              <Save size={16} />
              {saving ? "Sauvegarde en cours..." : "Enregistrer les modifications"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
