"use client";
import { useEffect, useRef, useState } from "react";
import {
  X,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  Radio,
  AlertTriangle,
  Play,
  Pause,
  SkipBack,
  SkipForward,
} from "lucide-react";

interface Props {
  url: string;
  title?: string;
  isLive?: boolean;
  onClose?: () => void;
}

function errorLabel(code?: number, type?: string): string {
  if (code === 509) return "Limite de connexions atteinte (509) — vérifiez votre abonnement IPTV.";
  if (code === 403) return "Accès refusé (403) — identifiants invalides ou accès restreint.";
  if (code === 401) return "Non autorisé (401) — identifiants incorrects.";
  if (code === 404) return "Flux introuvable (404) — chaîne indisponible.";
  if (code && code >= 500) return `Erreur serveur IPTV (${code}) — réessayez plus tard.`;
  return `Lecture impossible${type ? ` (${type})` : ""} — flux indisponible.`;
}

function extractStreamId(url: string): string | null {
  try {
    const u = new URL(url, window.location.origin);
    return u.searchParams.get("streamId");
  } catch {
    return null;
  }
}

function formatTime(s: number): string {
  if (!isFinite(s) || s < 0) return "0:00";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

const btnStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "white",
  cursor: "pointer",
  padding: "4px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

export default function Player({ url, title, isLive, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (!videoRef.current || !url) return;
    const video = videoRef.current;
    setLoading(true);
    setError(null);
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);

    const streamId = extractStreamId(url);

    let heartbeatTimer: ReturnType<typeof setInterval> | undefined;
    if (streamId) {
      heartbeatTimer = setInterval(() => {
        fetch(`/api/live/hls?heartbeat=${streamId}`).catch(() => {});
      }, 10_000);
    }

    const isM3U8 = url.includes(".m3u8") || url.includes("/hls") || isLive;

    if (isM3U8) {
      let destroyed = false;
      let hlsInstance: any = null;
      import("hls.js").then(({ default: Hls }) => {
        if (destroyed) return;

        if (Hls.isSupported()) {
          hlsInstance = new Hls({ enableWorker: true });
          hlsInstance.loadSource(url);
          hlsInstance.attachMedia(video);

          hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
            video.play().catch(() => {});
            setLoading(false);
          });

          hlsInstance.on(Hls.Events.ERROR, (_: any, data: any) => {
            if (data.fatal) {
              setLoading(false);
              const code = (data.response as any)?.code as number | undefined;
              setError(errorLabel(code, data.type));
              hlsInstance?.destroy();
            }
          });
        } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
          video.src = url;
          video.play().catch(() => {});
          setLoading(false);
        } else {
          setError("Votre navigateur ne supporte pas la lecture HLS.");
          setLoading(false);
        }
      });

      return () => {
        destroyed = true;
        if (heartbeatTimer) clearInterval(heartbeatTimer);
        hlsInstance?.destroy();
        if (streamId) fetch(`/api/live/hls?stop=${streamId}`).catch(() => {});
      };
    } else {
      video.src = url;
      video.play().catch(() => {});
      video.oncanplay = () => setLoading(false);
      video.onerror = () => {
        setLoading(false);
        setError("Impossible de lire ce fichier vidéo.");
      };

      return () => {
        if (heartbeatTimer) clearInterval(heartbeatTimer);
        if (streamId) fetch(`/api/live/hls?stop=${streamId}`).catch(() => {});
      };
    }
  }, [url, isLive, retryKey]);

  // Time tracking
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTimeUpdate = () => setCurrentTime(video.currentTime);
    const onDurationChange = () => setDuration(video.duration || 0);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => setPlaying(false);

    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("durationchange", onDurationChange);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("ended", onEnded);

    return () => {
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("durationchange", onDurationChange);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("ended", onEnded);
    };
  }, []);

  // Keyboard controls
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const video = videoRef.current;
      if (!video) return;
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;

      switch (e.key) {
        case " ":
        case "k":
          e.preventDefault();
          video.paused ? video.play() : video.pause();
          break;
        case "ArrowLeft":
          e.preventDefault();
          video.currentTime = Math.max(0, video.currentTime - 10);
          break;
        case "ArrowRight":
          e.preventDefault();
          video.currentTime = Math.min(video.duration || 0, video.currentTime + 10);
          break;
        case "ArrowUp":
          e.preventDefault();
          video.volume = Math.min(1, video.volume + 0.1);
          setVolume(video.volume);
          break;
        case "ArrowDown":
          e.preventDefault();
          video.volume = Math.max(0, video.volume - 0.1);
          setVolume(video.volume);
          break;
        case "f":
          e.preventDefault();
          toggleFullscreen();
          break;
        case "m":
          e.preventDefault();
          setMuted((m) => {
            video.muted = !m;
            return !m;
          });
          break;
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  function togglePlay() {
    const video = videoRef.current;
    if (!video) return;
    video.paused ? video.play() : video.pause();
  }

  function toggleFullscreen() {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      wrapper.requestFullscreen();
    }
  }

  function seekTo(e: React.ChangeEvent<HTMLInputElement>) {
    const video = videoRef.current;
    if (!video || !duration) return;
    const time = (parseFloat(e.target.value) / 100) * duration;
    video.currentTime = time;
  }

  function seekOffset(seconds: number) {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(video.duration || 0, video.currentTime + seconds));
  }

  function changeVolume(e: React.ChangeEvent<HTMLInputElement>) {
    const video = videoRef.current;
    if (!video) return;
    const val = parseFloat(e.target.value) / 100;
    video.volume = val;
    setVolume(val);
    if (val === 0) {
      video.muted = true;
      setMuted(true);
    } else if (muted) {
      video.muted = false;
      setMuted(false);
    }
  }

  function toggleMute() {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(!muted);
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div ref={wrapperRef} style={{ borderRadius: 16, overflow: "hidden", background: "#000" }}>
      {/* Video container */}
      <div style={{ position: "relative", aspectRatio: "16/9", background: "#000" }}>
        {/* Loading spinner */}
        {loading && !error && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)", zIndex: 5 }}>
            <div style={{ width: 40, height: 40, border: "4px solid #6c63ff", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
          </div>
        )}

        {/* Error overlay */}
        {error && (
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.85)", zIndex: 10, padding: 24, gap: 12 }}>
            <AlertTriangle size={36} color="#f87171" />
            <p style={{ color: "white", fontWeight: 600, fontSize: 14, textAlign: "center" }}>{error}</p>
            <button
              onClick={() => { setError(null); setRetryKey((k) => k + 1); }}
              style={{ marginTop: 8, fontSize: 12, color: "rgba(255,255,255,0.5)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
            >
              Réessayer
            </button>
          </div>
        )}

        <video
          ref={videoRef}
          style={{ width: "100%", height: "100%", display: "block", objectFit: "contain", background: "#000" }}
          playsInline
          muted={muted}
          onWaiting={() => setLoading(true)}
          onPlaying={() => setLoading(false)}
        />

        {/* Big play button when paused */}
        {!playing && !loading && !error && (
          <div
            style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 3, cursor: "pointer" }}
            onClick={togglePlay}
          >
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Play size={32} color="white" fill="white" />
            </div>
          </div>
        )}
      </div>

      {/* Controls — in normal flow below the video, not overlapping */}
      <div
        data-controls
        style={{
          background: "#111",
          padding: "6px 12px 8px",
        }}
      >
        {/* Progress bar (VOD only) */}
        {!isLive && duration > 0 && (
          <div style={{ marginBottom: 4 }}>
            <div style={{ position: "relative", height: 4, background: "rgba(255,255,255,0.15)", borderRadius: 2, cursor: "pointer" }}>
              <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: `${progress}%`, background: "#6c63ff", borderRadius: 2 }} />
              <input
                type="range"
                min={0}
                max={100}
                step={0.1}
                value={progress}
                onChange={seekTo}
                style={{ position: "absolute", inset: 0, width: "100%", opacity: 0, cursor: "pointer", height: 16, top: -6 }}
              />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        )}

        {/* Buttons row */}
        <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
          {/* Play/Pause */}
          <button onClick={togglePlay} style={btnStyle} aria-label={playing ? "Pause" : "Play"}>
            {playing ? <Pause size={22} color="white" /> : <Play size={22} color="white" fill="white" />}
          </button>

          {/* Skip back/forward */}
          {!isLive && (
            <>
              <button onClick={() => seekOffset(-10)} style={{ ...btnStyle, color: "rgba(255,255,255,0.7)" }} title="Reculer 10s">
                <SkipBack size={18} />
              </button>
              <button onClick={() => seekOffset(10)} style={{ ...btnStyle, color: "rgba(255,255,255,0.7)" }} title="Avancer 10s">
                <SkipForward size={18} />
              </button>
            </>
          )}

          {/* Volume */}
          <button onClick={toggleMute} style={btnStyle}>
            {muted || volume === 0 ? <VolumeX size={18} color="rgba(255,255,255,0.7)" /> : <Volume2 size={18} color="rgba(255,255,255,0.7)" />}
          </button>
          <input
            type="range"
            min={0}
            max={100}
            value={muted ? 0 : volume * 100}
            onChange={changeVolume}
            style={{ width: 56, height: 4, cursor: "pointer", accentColor: "#6c63ff" }}
          />

          {/* Title */}
          {title && <span style={{ flex: 1, fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "white", padding: "0 8px", minWidth: 0 }}>{title}</span>}

          {/* Live badge */}
          {isLive && (
            <button
              onClick={() => videoRef.current && (videoRef.current.currentTime = 1e10)}
              style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, background: "#dc2626", color: "white", border: "none", borderRadius: 20, padding: "3px 10px", cursor: "pointer" }}
            >
              <Radio size={12} /> LIVE
            </button>
          )}

          {/* Fullscreen */}
          <button onClick={toggleFullscreen} style={btnStyle}>
            {isFullscreen ? <Minimize2 size={18} color="rgba(255,255,255,0.7)" /> : <Maximize2 size={18} color="rgba(255,255,255,0.7)" />}
          </button>

          {/* Close */}
          {onClose && (
            <button onClick={onClose} style={btnStyle}>
              <X size={18} color="rgba(255,255,255,0.7)" />
            </button>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
