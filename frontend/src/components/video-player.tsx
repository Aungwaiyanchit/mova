import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  Captions,
  Check,
  Download,
  Loader2,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  Volume1,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import { formatClockTime, formatDataRate } from "../lib/format";
import { isHlsStream } from "../lib/streams";

type PlaybackState = "Buffering" | "Connecting" | "Paused" | "Playing";

const SKIP_SECONDS = 10;
const CONTROL_HIDE_DELAY_MS = 2600;

function SeekBar({
  bufferedEnd,
  current,
  duration,
  onSeek,
}: {
  bufferedEnd: number;
  current: number;
  duration: number;
  onSeek: (time: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [hoverRatio, setHoverRatio] = useState<number>();
  const [scrubTime, setScrubTime] = useState<number>();

  const seekable = duration > 0 && Number.isFinite(duration);
  const displayTime = scrubTime ?? current;
  const playedRatio = seekable ? Math.min(current / duration, 1) : 0;
  const scrubRatio = seekable ? Math.min(displayTime / duration, 1) : 0;
  const bufferedRatio = seekable ? Math.min(bufferedEnd / duration, 1) : 0;
  const bubbleRatio = scrubTime !== undefined ? scrubRatio : (hoverRatio ?? undefined);
  const bubbleTime = bubbleRatio !== undefined && seekable ? bubbleRatio * duration : undefined;

  function timeAt(clientX: number) {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || !seekable) return 0;
    const ratio = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
    return ratio * duration;
  }

  function ratioAt(clientX: number) {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return undefined;
    return Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
  }

  return (
    <div
      className="group/seek relative flex h-6 w-full touch-none items-center"
      ref={trackRef}
      role="slider"
      tabIndex={0}
      aria-label="Seek"
      aria-valuemin={0}
      aria-valuemax={Math.round(seekable ? duration : 0)}
      aria-valuenow={Math.round(displayTime)}
      aria-valuetext={`${formatClockTime(displayTime)} of ${formatClockTime(seekable ? duration : 0)}`}
      onPointerDown={(event) => {
        if (!seekable) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        setScrubTime(timeAt(event.clientX));
      }}
      onPointerMove={(event) => {
        if (scrubTime !== undefined) setScrubTime(timeAt(event.clientX));
        else setHoverRatio(ratioAt(event.clientX));
      }}
      onPointerUp={(event) => {
        if (scrubTime === undefined) return;
        onSeek(timeAt(event.clientX));
        setScrubTime(undefined);
      }}
      onPointerCancel={() => setScrubTime(undefined)}
      onPointerLeave={() => setHoverRatio(undefined)}
      onKeyDown={(event) => {
        if (!seekable) return;
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
          event.preventDefault();
          const step = event.key === "ArrowLeft" ? -SKIP_SECONDS : SKIP_SECONDS;
          onSeek(Math.min(Math.max(displayTime + step, 0), duration));
        } else if (event.key === "Home") {
          event.preventDefault();
          onSeek(0);
        } else if (event.key === "End") {
          event.preventDefault();
          onSeek(duration);
        }
      }}
    >
      <div className="relative h-1 w-full rounded-full bg-white/25 transition-all duration-200 group-hover/seek:h-1.5">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-white/30"
          style={{ width: `${bufferedRatio * 100}%` }}
        />
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-accent-bright"
          style={{ width: `${(scrubTime !== undefined ? scrubRatio : playedRatio) * 100}%` }}
        />
        <span
          className={`absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow transition-opacity duration-200 ${
            scrubTime !== undefined ? "opacity-100" : "opacity-0 group-hover/seek:opacity-100"
          }`}
          style={{ left: `${scrubRatio * 100}%` }}
        />
      </div>
      {bubbleTime !== undefined ? (
        <span
          className="pointer-events-none absolute -top-7 -translate-x-1/2 rounded-md bg-black/90 px-1.5 py-0.5 text-xs font-bold tabular-nums text-white"
          style={{ left: `${(bubbleRatio ?? 0) * 100}%` }}
        >
          {formatClockTime(bubbleTime)}
        </span>
      ) : null}
    </div>
  );
}

export function VideoPlayer({
  fallbackUrl,
  infoHash,
  movieId,
  movieTitle,
  poster,
  quality,
  sourceLabel,
  streamType,
  url,
}: {
  fallbackUrl?: string;
  infoHash?: string;
  movieId: number;
  movieTitle: string;
  poster?: string;
  quality?: string;
  sourceLabel: string;
  streamType?: string;
  url: string;
}) {
  const playerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const subtitleMenuRef = useRef<HTMLDivElement>(null);
  const audioProbeDoneRef = useRef(false);
  const hideControlsTimerRef = useRef<number | undefined>(undefined);
  const resumeTimeRef = useRef(0);
  const [bufferedEnd, setBufferedEnd] = useState(0);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [downloadSpeed, setDownloadSpeed] = useState<number>();
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string>();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [muted, setMuted] = useState(false);
  const [playbackUrl, setPlaybackUrl] = useState(url);
  const [playbackState, setPlaybackState] = useState<PlaybackState>("Connecting");
  const [selectedSubtitleId, setSelectedSubtitleId] = useState<string>();
  const [subtitleMenuOpen, setSubtitleMenuOpen] = useState(false);
  const [subtitleUrl, setSubtitleUrl] = useState<string>();
  const [loadToken, setLoadToken] = useState(0);
  const [volume, setVolume] = useState(1);
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
  const playing = playbackState === "Playing";
  const busy = playbackState === "Buffering" || playbackState === "Connecting";

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
    audioProbeDoneRef.current = false;

    void loadToken;

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
  }, [loadToken, playbackUrl, streamType]);

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

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.volume = volume;
      video.muted = muted;
    }
  }, [muted, volume]);

  useEffect(() => {
    if (!subtitleMenuOpen) return;

    const closeIfOutside = (event: PointerEvent) => {
      if (!subtitleMenuRef.current?.contains(event.target as Node)) setSubtitleMenuOpen(false);
    };
    document.addEventListener("pointerdown", closeIfOutside);
    return () => document.removeEventListener("pointerdown", closeIfOutside);
  }, [subtitleMenuOpen]);

  useEffect(() => {
    window.clearTimeout(hideControlsTimerRef.current);
    if (!playing || subtitleMenuOpen) {
      setControlsVisible(true);
      return;
    }
    hideControlsTimerRef.current = window.setTimeout(
      () => setControlsVisible(false),
      CONTROL_HIDE_DELAY_MS,
    );
    return () => window.clearTimeout(hideControlsTimerRef.current);
  }, [playing, subtitleMenuOpen]);

  function revealControls() {
    setControlsVisible(true);
    window.clearTimeout(hideControlsTimerRef.current);
    if (playing) {
      hideControlsTimerRef.current = window.setTimeout(
        () => setControlsVisible(false),
        CONTROL_HIDE_DELAY_MS,
      );
    }
  }

  function togglePlay() {
    const video = videoRef.current;
    if (!video || error || busy) return;
    if (video.paused) void video.play().catch(() => undefined);
    else video.pause();
  }

  function skip(seconds: number) {
    const video = videoRef.current;
    if (!video || error || !Number.isFinite(video.duration)) return;
    const next = Math.min(Math.max(video.currentTime + seconds, 0), video.duration);
    video.currentTime = next;
    setCurrentTime(next);
    revealControls();
  }

  function seekTo(time: number) {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = time;
    setCurrentTime(time);
  }

  function toggleMute() {
    setMuted((previous) => !previous);
    revealControls();
  }

  async function toggleFullscreen() {
    if (document.fullscreenElement === playerRef.current) {
      await document.exitFullscreen();
      return;
    }
    await playerRef.current?.requestFullscreen();
  }

  function retryPlayback() {
    setError(undefined);
    setPlaybackState("Connecting");
    setLoadToken((token) => token + 1);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLElement>) {
    if ((event.target as HTMLElement).closest("button, input, select, [role='slider']")) return;
    if (event.key === " " || event.key.toLowerCase() === "k") {
      event.preventDefault();
      togglePlay();
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      skip(-SKIP_SECONDS);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      skip(SKIP_SECONDS);
    } else if (event.key.toLowerCase() === "m") {
      toggleMute();
    } else if (event.key.toLowerCase() === "f") {
      void toggleFullscreen();
    }
  }

  const VolumeIcon = muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  return (
    <div
      className={`relative aspect-video overflow-hidden rounded-xl border border-white/10 bg-black shadow-2xl fullscreen:aspect-auto fullscreen:h-screen fullscreen:w-screen fullscreen:rounded-none fullscreen:border-0 ${
        !controlsVisible ? "cursor-none" : ""
      }`}
      ref={playerRef}
      role="application"
      aria-label={`Video player for ${movieTitle}`}
      // biome-ignore lint/a11y/noNoninteractiveTabindex: custom player captures keyboard shortcuts
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onPointerDown={() => playerRef.current?.focus({ preventScroll: true })}
      onPointerMove={revealControls}
      onPointerLeave={() => playing && setSubtitleMenuOpen(false)}
    >
      {/* biome-ignore lint/a11y/useMediaCaption: Captions are loaded dynamically when the provider has a track. */}
      <video
        className="mova-video size-full bg-black object-contain"
        ref={videoRef}
        aria-label={`Playing ${movieTitle}`}
        poster={poster}
        autoPlay
        playsInline
        preload="metadata"
        onClick={togglePlay}
        onDoubleClick={() => void toggleFullscreen()}
        onCanPlay={() => {
          if (videoRef.current?.paused) setPlaybackState("Paused");
        }}
        onLoadedMetadata={() => {
          const video = videoRef.current;
          if (!video) return;
          setDuration(Number.isFinite(video.duration) ? video.duration : 0);
          const resumeAt = resumeTimeRef.current;
          resumeTimeRef.current = 0;
          if (resumeAt > 0 && Number.isFinite(video.duration) && resumeAt < video.duration) {
            video.currentTime = resumeAt;
          }
        }}
        onDurationChange={() => {
          const videoDuration = videoRef.current?.duration;
          setDuration(Number.isFinite(videoDuration) ? (videoDuration as number) : 0);
        }}
        onProgress={() => {
          const video = videoRef.current;
          if (!video) return;
          for (let index = 0; index < video.buffered.length; index += 1) {
            if (video.buffered.start(index) <= video.currentTime + 0.5) {
              setBufferedEnd(video.buffered.end(index));
            }
          }
        }}
        onTimeUpdate={() => {
          const video = videoRef.current;
          if (!video) return;
          setCurrentTime(video.currentTime);
          if (audioProbeDoneRef.current || video.currentTime < 3) return;
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

      {busy && !error ? (
        <div className="pointer-events-none absolute inset-0 grid place-items-center bg-black/45 p-6 text-center">
          <div role="status">
            <Loader2
              className="mx-auto size-10 animate-spin text-accent-bright"
              aria-hidden="true"
            />
            <p className="mt-3 text-xs font-bold text-white">
              {playbackState === "Connecting" ? "Connecting to peers..." : "Buffering..."}
            </p>
          </div>
        </div>
      ) : null}

      {playbackState === "Paused" && !error ? (
        <button
          className="absolute inset-0 grid place-items-center bg-black/25 transition hover:bg-black/35"
          type="button"
          aria-label="Play"
          onClick={togglePlay}
        >
          <span className="grid size-16 place-items-center rounded-full bg-white/15 text-white backdrop-blur transition hover:scale-105 hover:bg-white/25">
            <Play className="ml-1 size-7 fill-current" aria-hidden="true" />
          </span>
        </button>
      ) : null}

      <div
        className={`pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-3 bg-gradient-to-b from-black/90 via-black/45 to-transparent px-3 pb-12 pt-3 text-white transition-opacity duration-300 sm:px-4 fullscreen:px-6 fullscreen:pt-5 ${
          controlsVisible ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold fullscreen:text-base" title={movieTitle}>
              {movieTitle}
            </p>
            <p className="mt-0.5 max-w-xl truncate text-xs text-white/75" title={sourceLabel}>
              {sourceLabel}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {quality ? (
            <span className="rounded-md bg-accent px-2 py-1 text-xs font-extrabold uppercase tracking-wide text-white">
              {quality}
            </span>
          ) : null}
          {streamType ? (
            <span className="rounded-md bg-white/15 px-2 py-1 text-xs font-extrabold uppercase tracking-wide text-white/75">
              {streamType}
            </span>
          ) : null}
          <span
            className={`size-1.5 rounded-full ${playing ? "bg-accent-bright" : "bg-white/50"}`}
            aria-hidden="true"
          />
        </div>
      </div>

      <div
        className={`absolute inset-x-0 bottom-0 z-10 flex flex-col gap-1 bg-gradient-to-t from-black/90 via-black/45 to-transparent px-3 pb-2.5 pt-10 text-white transition-opacity duration-300 sm:px-4 fullscreen:px-6 fullscreen:pb-4 ${
          controlsVisible ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <SeekBar
          bufferedEnd={bufferedEnd}
          current={currentTime}
          duration={duration}
          onSeek={seekTo}
        />
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1 sm:gap-1.5">
            <button
              className="grid size-9 place-items-center rounded-full text-white/85 transition hover:bg-white/15 hover:text-white"
              type="button"
              aria-label={playing ? "Pause" : "Play"}
              onClick={togglePlay}
            >
              {playing ? (
                <Pause className="size-5 fill-current" aria-hidden="true" />
              ) : (
                <Play className="size-5 fill-current" aria-hidden="true" />
              )}
            </button>
            <button
              className="grid size-9 place-items-center rounded-full text-white/85 transition hover:bg-white/15 hover:text-white"
              type="button"
              aria-label={`Skip back ${SKIP_SECONDS} seconds`}
              onClick={() => skip(-SKIP_SECONDS)}
            >
              <span className="flex flex-col items-center leading-none">
                <RotateCcw className="size-4" aria-hidden="true" />
                <span className="mt-0.5 text-[0.65rem] font-extrabold">10</span>
              </span>
            </button>
            <button
              className="grid size-9 place-items-center rounded-full text-white/85 transition hover:bg-white/15 hover:text-white"
              type="button"
              aria-label={`Skip forward ${SKIP_SECONDS} seconds`}
              onClick={() => skip(SKIP_SECONDS)}
            >
              <span className="flex flex-col items-center leading-none">
                <RotateCw className="size-4" aria-hidden="true" />
                <span className="mt-0.5 text-[0.65rem] font-extrabold">10</span>
              </span>
            </button>
            <div className="flex items-center gap-1 pl-0.5">
              <button
                className="grid size-9 place-items-center rounded-full text-white/85 transition hover:bg-white/15 hover:text-white"
                type="button"
                aria-label={muted ? "Unmute" : "Mute"}
                onClick={toggleMute}
              >
                <VolumeIcon className="size-5" aria-hidden="true" />
              </button>
              <input
                className="mova-volume hidden w-16 sm:block"
                type="range"
                min={0}
                max={100}
                step={1}
                value={muted ? 0 : Math.round(volume * 100)}
                aria-label="Volume"
                onChange={(event) => {
                  const next = Number(event.target.value) / 100;
                  setVolume(next);
                  setMuted(next === 0);
                }}
              />
            </div>
            <span className="ml-1 hidden text-xs font-bold tabular-nums text-white/75 min-[420px]:inline">
              {formatClockTime(currentTime)} / {formatClockTime(duration)}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
            <div className="relative" ref={subtitleMenuRef}>
              <button
                className={`grid size-9 place-items-center rounded-full transition hover:bg-white/15 hover:text-white ${
                  activeSubtitleId !== "off" ? "text-accent-bright" : "text-white/85"
                }`}
                type="button"
                aria-label="Subtitles"
                aria-haspopup="menu"
                aria-expanded={subtitleMenuOpen}
                onClick={() => setSubtitleMenuOpen((previous) => !previous)}
              >
                <Captions className="size-5" aria-hidden="true" />
              </button>
              {subtitleMenuOpen ? (
                <div
                  className="absolute bottom-full right-0 mb-3 max-h-56 w-44 overflow-y-auto rounded-xl border border-white/15 bg-black/90 p-1 text-white backdrop-blur"
                  role="menu"
                  aria-label="Subtitle tracks"
                >
                  <button
                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs font-bold transition hover:bg-white/10 ${
                      activeSubtitleId === "off" ? "text-accent-bright" : "text-white/85"
                    }`}
                    type="button"
                    role="menuitemradio"
                    aria-checked={activeSubtitleId === "off"}
                    onClick={() => {
                      setSelectedSubtitleId("off");
                      setSubtitleMenuOpen(false);
                    }}
                  >
                    Subtitles off
                    {activeSubtitleId === "off" ? (
                      <Check className="size-3.5" aria-hidden="true" />
                    ) : null}
                  </button>
                  {subtitleTracks.map((track) => (
                    <button
                      className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs font-bold transition hover:bg-white/10 ${
                        activeSubtitleId === track.id ? "text-accent-bright" : "text-white/85"
                      }`}
                      type="button"
                      role="menuitemradio"
                      aria-checked={activeSubtitleId === track.id}
                      key={track.id}
                      onClick={() => {
                        setSelectedSubtitleId(track.id);
                        setSubtitleMenuOpen(false);
                      }}
                    >
                      <span className="truncate">{track.label}</span>
                      {activeSubtitleId === track.id ? (
                        <Check className="size-3.5 shrink-0" aria-hidden="true" />
                      ) : null}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2 text-xs font-bold tabular-nums text-white/75"
              title="Download speed"
            >
              <Download className="size-3.5" aria-hidden="true" />
              {downloadSpeed === undefined ? "--" : formatDataRate(downloadSpeed)}
            </span>
            <button
              className="grid size-9 place-items-center rounded-full text-white/85 transition hover:bg-white/15 hover:text-white disabled:opacity-40"
              type="button"
              aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              disabled={!document.fullscreenEnabled}
              onClick={() => void toggleFullscreen()}
            >
              {isFullscreen ? (
                <Minimize2 className="size-5" aria-hidden="true" />
              ) : (
                <Maximize2 className="size-5" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>

      {error ? (
        <div
          className="absolute inset-0 z-20 grid place-items-center bg-black/90 p-6 text-center"
          role="alert"
        >
          <div>
            <AlertCircle className="mx-auto size-7 text-accent-bright" aria-hidden="true" />
            <p className="mt-3 text-sm font-bold text-white">Playback unavailable</p>
            <p className="mt-1 text-xs text-white/75">{error}</p>
            <button
              className="mt-4 rounded-full bg-accent px-5 py-2 text-xs font-extrabold text-white transition hover:bg-accent-bright hover:text-page"
              type="button"
              onClick={retryPlayback}
            >
              Try again
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
