import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Captions, Download, Maximize2, Minimize2, RadioTower } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import { formatDataRate } from "../lib/format";
import { isHlsStream } from "../lib/streams";

type PlaybackState = "Buffering" | "Connecting" | "Paused" | "Playing";

export function VideoPlayer({
  infoHash,
  fallbackUrl,
  movieId,
  movieTitle,
  poster,
  sourceLabel,
  streamType,
  url,
}: {
  infoHash?: string;
  fallbackUrl?: string;
  movieId: number;
  movieTitle: string;
  poster?: string;
  sourceLabel: string;
  streamType?: string;
  url: string;
}) {
  const playerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioProbeDoneRef = useRef(false);
  const resumeTimeRef = useRef(0);
  const [downloadSpeed, setDownloadSpeed] = useState<number>();
  const [error, setError] = useState<string>();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackUrl, setPlaybackUrl] = useState(url);
  const [playbackState, setPlaybackState] = useState<PlaybackState>("Connecting");
  const [ready, setReady] = useState(false);
  const [selectedSubtitleId, setSelectedSubtitleId] = useState<string>();
  const [subtitleUrl, setSubtitleUrl] = useState<string>();
  const subtitlesQuery = useQuery({
    queryKey: ["movie-subtitles", movieId],
    queryFn: () => api.getSubtitles(movieId),
    staleTime: 24 * 60 * 60 * 1000,
  });
  const subtitleTracks = subtitlesQuery.data?.subtitles ?? [];
  const activeSubtitleId =
    selectedSubtitleId ??
    subtitleTracks.find((track) => track.language === "en")?.id ??
    subtitleTracks[0]?.id ??
    "off";
  const activeSubtitle = subtitleTracks.find((track) => track.id === activeSubtitleId);

  useEffect(() => setPlaybackUrl(url), [url]);

  useEffect(() => {
    const videoElement = videoRef.current;
    const streamUrl = playbackUrl;
    if (!videoElement || !streamUrl) return;

    let cancelled = false;
    let hls: { destroy: () => void } | undefined;
    setError(undefined);
    setDownloadSpeed(undefined);
    setPlaybackState("Connecting");
    setReady(false);
    audioProbeDoneRef.current = false;

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

      const player = new Hls({
        manifestLoadingMaxRetry: 2,
        manifestLoadingTimeOut: 90_000,
      });
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
  }, [playbackUrl, streamType]);

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

  useEffect(() => {
    const updateFullscreen = () => {
      setIsFullscreen(document.fullscreenElement === playerRef.current);
    };
    document.addEventListener("fullscreenchange", updateFullscreen);
    return () => document.removeEventListener("fullscreenchange", updateFullscreen);
  }, []);

  useEffect(() => {
    setSubtitleUrl(undefined);
    if (!activeSubtitle) return;

    const controller = new AbortController();
    let objectUrl: string | undefined;
    void api
      .getSubtitleFile(movieId, activeSubtitle.id, controller.signal)
      .then((subtitle) => {
        objectUrl = URL.createObjectURL(new Blob([subtitle], { type: "text/vtt" }));
        setSubtitleUrl(objectUrl);
      })
      .catch(() => {
        if (!controller.signal.aborted) setSubtitleUrl(undefined);
      });

    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [activeSubtitle, movieId]);

  async function toggleFullscreen() {
    if (document.fullscreenElement === playerRef.current) {
      await document.exitFullscreen();
      return;
    }
    await playerRef.current?.requestFullscreen();
  }

  return (
    <div
      className="relative aspect-video overflow-hidden rounded-xl border border-white/10 bg-black shadow-2xl fullscreen:aspect-auto fullscreen:h-screen fullscreen:w-screen fullscreen:rounded-none fullscreen:border-0"
      ref={playerRef}
    >
      {/* biome-ignore lint/a11y/useMediaCaption: Captions are loaded dynamically when the provider has a track. */}
      <video
        className="mova-video size-full bg-black object-contain"
        ref={videoRef}
        aria-label={`Playing ${movieTitle}`}
        poster={poster}
        controls
        controlsList="nofullscreen"
        autoPlay
        playsInline
        preload="metadata"
        onCanPlay={() => {
          setReady(true);
          if (videoRef.current?.paused) setPlaybackState("Paused");
        }}
        onLoadedMetadata={() => {
          const video = videoRef.current;
          const resumeAt = resumeTimeRef.current;
          resumeTimeRef.current = 0;
          if (
            video &&
            resumeAt > 0 &&
            Number.isFinite(video.duration) &&
            resumeAt < video.duration
          ) {
            video.currentTime = resumeAt;
          }
        }}
        onTimeUpdate={() => {
          const video = videoRef.current;
          if (!video || audioProbeDoneRef.current || video.currentTime < 3) return;
          audioProbeDoneRef.current = true;
          if (
            fallbackUrl &&
            playbackUrl !== fallbackUrl &&
            (video as HTMLVideoElement & { webkitAudioDecodedByteCount?: number })
              .webkitAudioDecodedByteCount === 0
          ) {
            resumeTimeRef.current = video.currentTime;
            setPlaybackUrl(fallbackUrl);
          }
        }}
        onError={() => {
          if (fallbackUrl && playbackUrl !== fallbackUrl) {
            resumeTimeRef.current = videoRef.current?.currentTime ?? 0;
            setPlaybackUrl(fallbackUrl);
            return;
          }
          setError("This source could not be played. Try another source.");
        }}
        onPause={() => setPlaybackState("Paused")}
        onPlaying={() => setPlaybackState("Playing")}
        onWaiting={() => setPlaybackState("Buffering")}
      >
        {subtitleUrl && activeSubtitle ? (
          <track
            default
            kind="subtitles"
            label={activeSubtitle.label}
            src={subtitleUrl}
            srcLang={activeSubtitle.language}
          />
        ) : null}
      </video>
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-3 bg-gradient-to-b from-black/90 to-transparent px-3 pb-10 pt-3 text-white sm:px-4 fullscreen:px-6 fullscreen:pt-5">
        <div className="flex min-w-0 items-center gap-2">
          <RadioTower className="size-3.5 shrink-0 text-accent-bright" aria-hidden="true" />
          <div className="min-w-0">
            <p className="truncate text-[0.65rem] font-bold fullscreen:text-sm">
              {isFullscreen ? movieTitle : sourceLabel}
            </p>
            {isFullscreen ? (
              <p
                className="mt-1 max-w-xl truncate text-[0.65rem] text-white/60"
                title={sourceLabel}
              >
                {sourceLabel}
              </p>
            ) : null}
          </div>
          <span className="shrink-0 rounded bg-white/15 px-1.5 py-0.5 text-[0.6rem] font-extrabold uppercase tracking-wide text-white/75">
            {streamType ?? "Direct"}
          </span>
        </div>
        <div className="pointer-events-auto flex shrink-0 items-center gap-2 text-[0.65rem] font-bold sm:gap-3">
          <span className="hidden items-center gap-1.5 sm:inline-flex">
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
          <label className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-black/40 px-2 py-1.5 backdrop-blur">
            <Captions className="size-3.5" aria-hidden="true" />
            <span className="sr-only">Subtitles</span>
            <select
              className="max-w-24 bg-transparent text-[0.65rem] font-bold text-white outline-none sm:max-w-32"
              value={activeSubtitleId}
              aria-label="Subtitles"
              onChange={(event) => setSelectedSubtitleId(event.target.value)}
            >
              <option value="off">Subtitles off</option>
              {subtitleTracks.map((track) => (
                <option className="bg-black text-white" value={track.id} key={track.id}>
                  {track.label}
                </option>
              ))}
            </select>
          </label>
          <button
            className="grid size-8 place-items-center rounded-lg border border-white/15 bg-black/40 text-white backdrop-blur transition hover:border-white/40 hover:bg-white/15 disabled:opacity-40"
            type="button"
            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            disabled={!document.fullscreenEnabled}
            onClick={() => void toggleFullscreen()}
          >
            {isFullscreen ? (
              <Minimize2 className="size-3.5" aria-hidden="true" />
            ) : (
              <Maximize2 className="size-3.5" aria-hidden="true" />
            )}
          </button>
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
