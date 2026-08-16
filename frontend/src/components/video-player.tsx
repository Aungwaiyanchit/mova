import { AlertCircle, Download, RadioTower } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import { formatDataRate } from "../lib/format";
import { isHlsStream } from "../lib/streams";

type PlaybackState = "Buffering" | "Connecting" | "Paused" | "Playing";

export function VideoPlayer({
  infoHash,
  movieId,
  movieTitle,
  poster,
  sourceLabel,
  streamType,
  url,
}: {
  infoHash?: string;
  movieId: number;
  movieTitle: string;
  poster?: string;
  sourceLabel: string;
  streamType?: string;
  url: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [downloadSpeed, setDownloadSpeed] = useState<number>();
  const [error, setError] = useState<string>();
  const [playbackState, setPlaybackState] = useState<PlaybackState>("Connecting");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const videoElement = videoRef.current;
    const streamUrl = url;
    if (!videoElement || !streamUrl) return;

    let cancelled = false;
    let hls: { destroy: () => void } | undefined;
    setError(undefined);
    setDownloadSpeed(undefined);
    setPlaybackState("Connecting");
    setReady(false);

    async function attachSource(element: HTMLVideoElement, sourceUrl: string) {
      if (!isHlsStream(sourceUrl, streamType)) {
        element.src = sourceUrl;
        return;
      }

      if (element.canPlayType("application/vnd.apple.mpegurl")) {
        element.src = sourceUrl;
        return;
      }

      const { default: Hls } = await import("hls.js");
      if (cancelled) return;
      if (!Hls.isSupported()) {
        setError("This browser cannot play this HLS source.");
        return;
      }

      const player = new Hls();
      hls = player;
      player.loadSource(sourceUrl);
      player.attachMedia(element);
      player.on(Hls.Events.FRAG_LOADED, () => {
        if (!cancelled) setDownloadSpeed(player.bandwidthEstimate / 8);
      });
      player.on(Hls.Events.ERROR, (_event, data) => {
        if (!cancelled && data.fatal) setError("The selected stream stopped responding.");
      });
    }

    void attachSource(videoElement, streamUrl).catch(() => {
      if (!cancelled) setError("The video player could not load this source.");
    });

    return () => {
      cancelled = true;
      hls?.destroy();
      videoElement.pause();
      videoElement.removeAttribute("src");
      videoElement.load();
    };
  }, [url, streamType]);

  useEffect(() => {
    if (!infoHash) return;

    let cancelled = false;
    const updateSpeed = async () => {
      try {
        const status = await api.getStreamStatus(movieId, infoHash);
        if (!cancelled) setDownloadSpeed(status.downloadSpeed);
      } catch {
        if (!cancelled) setDownloadSpeed(undefined);
      }
    };

    void updateSpeed();
    const timer = window.setInterval(() => void updateSpeed(), 1_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [infoHash, movieId]);

  return (
    <div className="relative aspect-video overflow-hidden rounded-xl border border-white/10 bg-black shadow-2xl">
      {/* biome-ignore lint/a11y/useMediaCaption: The source API does not provide subtitle tracks. */}
      <video
        className="size-full bg-black object-contain"
        ref={videoRef}
        aria-label={`Playing ${movieTitle}`}
        poster={poster}
        controls
        autoPlay
        playsInline
        preload="metadata"
        onCanPlay={() => {
          setReady(true);
          if (videoRef.current?.paused) setPlaybackState("Paused");
        }}
        onError={() => setError("This source could not be played. Try another source.")}
        onPause={() => setPlaybackState("Paused")}
        onPlaying={() => setPlaybackState("Playing")}
        onWaiting={() => setPlaybackState("Buffering")}
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-3 bg-gradient-to-b from-black/85 to-transparent px-3 pb-8 pt-3 text-white sm:px-4">
        <div className="flex min-w-0 items-center gap-2">
          <RadioTower className="size-3.5 shrink-0 text-accent-bright" aria-hidden="true" />
          <span className="truncate text-[0.65rem] font-bold" title={sourceLabel}>
            {sourceLabel}
          </span>
          <span className="shrink-0 rounded bg-white/15 px-1.5 py-0.5 text-[0.6rem] font-extrabold uppercase tracking-wide text-white/75">
            {streamType ?? "Direct"}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-3 text-[0.65rem] font-bold">
          <span className="inline-flex items-center gap-1.5">
            <span
              className={`size-1.5 rounded-full ${playbackState === "Playing" ? "bg-emerald-400" : "bg-amber-400"}`}
              aria-hidden="true"
            />
            {playbackState}
          </span>
          <span className="inline-flex items-center gap-1.5 tabular-nums text-white/75">
            <Download className="size-3" aria-hidden="true" />
            {downloadSpeed === undefined ? "--" : formatDataRate(downloadSpeed)}
          </span>
        </div>
      </div>
      {!ready && !error ? (
        <div className="pointer-events-none absolute inset-0 grid place-items-center bg-black/65 p-6 text-center">
          <div role="status">
            <span className="mx-auto block size-8 animate-spin rounded-full border-2 border-white/25 border-t-accent-bright" />
            <p className="mt-3 text-xs font-bold text-white">Connecting to peers...</p>
          </div>
        </div>
      ) : null}
      {error ? (
        <div
          className="absolute inset-0 z-20 grid place-items-center bg-black/90 p-6 text-center"
          role="alert"
        >
          <div>
            <AlertCircle className="mx-auto size-7 text-accent-bright" aria-hidden="true" />
            <p className="mt-3 text-sm font-bold text-white">Playback unavailable</p>
            <p className="mt-1 text-xs text-white/60">{error}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
