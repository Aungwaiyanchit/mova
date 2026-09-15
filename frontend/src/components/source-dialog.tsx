import { useQuery } from "@tanstack/react-query";
import { HardDrive, Play, Server, Users, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import {
  directStreamUrl,
  groupStreamsByQuality,
  hasEnglishAudio,
  isBrowserReadyRelease,
  type StreamQuality,
  streamQuality,
  streamTechnicalTags,
} from "../lib/streams";
import type { MovieStream } from "../types/api";
import { StatePanel } from "./state-panel";
import { VideoPlayer } from "./video-player";

const SOURCE_PLACEHOLDERS = ["source-one", "source-two", "source-three", "source-four"];

export function SourceDialog({
  movieId,
  movieTitle,
  poster,
  open,
  onClose,
}: {
  movieId: number;
  movieTitle: string;
  poster?: string;
  open: boolean;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const playerSectionRef = useRef<HTMLDivElement>(null);
  const [selectedQuality, setSelectedQuality] = useState<StreamQuality>();
  const [selectedStream, setSelectedStream] = useState<MovieStream>();
  const streamsQuery = useQuery({
    queryKey: ["movie-streams", movieId],
    queryFn: () => api.getStreams(movieId),
    enabled: open,
    staleTime: 30 * 60 * 1000,
  });

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (!selectedStream) return;
    playerSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [selectedStream]);

  function closeDialog() {
    setSelectedQuality(undefined);
    setSelectedStream(undefined);
    onClose();
  }

  const streams = (streamsQuery.data?.streams ?? []).filter(hasEnglishAudio);
  const groups = groupStreamsByQuality(streams);
  const activeQuality = selectedQuality ?? groups[0]?.quality;
  const activeGroup = groups.find((group) => group.quality === activeQuality);
  const directUrl = selectedStream ? directStreamUrl(selectedStream) : undefined;
  const torrentVideoUrl = selectedStream?.infoHash
    ? api.getStreamVideoUrl(movieId, selectedStream.infoHash, selectedStream.fileIndex)
    : undefined;
  const torrentHlsUrl = selectedStream?.infoHash
    ? api.getStreamHlsUrl(movieId, selectedStream.infoHash, selectedStream.fileIndex)
    : undefined;
  const directPlayback = Boolean(selectedStream && isBrowserReadyRelease(selectedStream));
  const selectedUrl = directUrl ?? (directPlayback ? torrentVideoUrl : torrentHlsUrl);
  const fallbackUrl = directUrl || !directPlayback ? undefined : torrentHlsUrl;

  return (
    <dialog
      className="fixed inset-x-0 bottom-0 top-auto m-0 max-h-[92vh] w-full max-w-none overflow-y-auto rounded-t-3xl border border-line bg-page-raised p-0 text-ink shadow-2xl backdrop:bg-black/80 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:w-[min(64rem,calc(100%-2rem))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl"
      ref={dialogRef}
      aria-labelledby="source-dialog-title"
      onClose={closeDialog}
    >
      <div className="sticky top-0 z-20 flex items-start justify-between border-b border-line bg-page-raised/95 px-5 py-5 backdrop-blur sm:px-7">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-accent-bright">
            Watch now
          </p>
          <h2 className="mt-1 font-display text-xl font-bold" id="source-dialog-title">
            {movieTitle}
          </h2>
        </div>
        <button
          className="grid size-9 place-items-center rounded-full border border-line text-muted hover:text-ink"
          type="button"
          aria-label="Close player"
          onClick={() => dialogRef.current?.close()}
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="p-5 sm:p-7">
        <div ref={playerSectionRef}>
          {selectedStream && selectedUrl ? (
            <VideoPlayer
              fallbackUrl={fallbackUrl}
              infoHash={selectedStream.infoHash}
              movieId={movieId}
              movieTitle={movieTitle}
              poster={poster}
              quality={streamQuality(selectedStream)}
              sourceLabel={selectedStream.title}
              streamType={selectedStream.type}
              url={selectedUrl}
            />
          ) : (
            <div className="grid aspect-video place-items-center rounded-xl border border-line bg-black px-6 text-center">
              <div>
                <span className="mx-auto grid size-14 place-items-center rounded-full bg-accent text-white">
                  <Play className="ml-0.5 size-6 fill-current" aria-hidden="true" />
                </span>
                <p className="mt-4 font-display text-lg font-bold text-white">
                  Choose a source to play
                </p>
                <p className="mt-1 text-xs text-white/70">
                  Choose one of the ranked sources below.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="mt-7">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-accent-bright">
                Available sources
              </p>
              <h3 className="mt-1 font-display text-xl font-bold">Select quality</h3>
            </div>
            {streams.length ? (
              <span className="text-xs text-faint">{streams.length} sources</span>
            ) : null}
          </div>

          {streamsQuery.isPending ? (
            <div className="mt-5 space-y-3" role="status" aria-label="Loading sources">
              {SOURCE_PLACEHOLDERS.map((placeholder) => (
                <div className="h-24 animate-pulse rounded-xl bg-surface" key={placeholder} />
              ))}
            </div>
          ) : null}
          {streamsQuery.isError ? (
            <div className="mt-5">
              <StatePanel
                kind="error"
                title="Sources are offline"
                message="The source provider did not respond. Try this again shortly."
                actionLabel="Try sources again"
                onAction={() => streamsQuery.refetch()}
              />
            </div>
          ) : null}
          {streamsQuery.isSuccess && streams.length === 0 ? (
            <div className="mt-5">
              <StatePanel
                title="No English audio sources found"
                message="There are no English audio sources listed for this title right now."
              />
            </div>
          ) : null}

          {groups.length ? (
            <>
              <fieldset className="hide-scrollbar mt-5 flex min-w-0 gap-2 overflow-x-auto pb-2">
                <legend className="sr-only">Source quality</legend>
                {groups.map((group) => (
                  <button
                    className={`shrink-0 rounded-full border px-4 py-2 text-xs font-extrabold transition ${
                      activeQuality === group.quality
                        ? "border-accent bg-accent text-white"
                        : "border-line bg-surface text-muted hover:border-accent hover:text-ink"
                    }`}
                    key={group.quality}
                    type="button"
                    aria-pressed={activeQuality === group.quality}
                    onClick={() => {
                      setSelectedQuality(group.quality);
                      if (selectedStream && streamQuality(selectedStream) !== group.quality) {
                        setSelectedStream(undefined);
                      }
                    }}
                  >
                    {group.quality}
                    <span className="ml-2 text-current/70">{group.streams.length}</span>
                  </button>
                ))}
              </fieldset>

              <div className="mt-3 grid gap-4 md:grid-cols-2">
                {activeGroup?.streams.map((stream, index) => {
                  const directUrl = directStreamUrl(stream);
                  const playable = Boolean(directUrl || stream.infoHash);
                  const playing = selectedStream?.id === stream.id;
                  const technicalTags = streamTechnicalTags(stream.title);

                  return (
                    <article
                      className={`relative flex min-h-0 flex-col overflow-hidden rounded-2xl border bg-surface transition duration-300 hover:-translate-y-0.5 hover:border-accent/60 hover:shadow-xl hover:shadow-black/15 ${
                        playing ? "border-accent shadow-lg shadow-accent/10" : "border-line"
                      }`}
                      key={stream.id}
                    >
                      <span className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-accent-bright via-accent to-transparent" />
                      <div className="flex flex-1 flex-col p-5 pl-6">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <span className="grid h-12 min-w-14 shrink-0 place-items-center rounded-xl bg-accent font-display text-sm font-black text-white shadow-lg shadow-accent/20">
                              {streamQuality(stream)}
                            </span>
                            <div className="min-w-0">
                              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-faint">
                                Ranked source {String(index + 1).padStart(2, "0")}
                              </p>
                              <p className="mt-1 text-xs font-bold text-muted">
                                {directUrl ? "Direct stream" : "Torrent release"}
                              </p>
                            </div>
                          </div>
                          {playing ? (
                            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-accent/15 px-2.5 py-1 text-xs font-extrabold uppercase tracking-wider text-accent-bright">
                              <span
                                className="size-1.5 rounded-full bg-accent-bright"
                                aria-hidden="true"
                              />
                              Playing
                            </span>
                          ) : null}
                        </div>

                        <h4
                          className="mt-5 line-clamp-3 font-display text-[0.95rem] font-bold leading-6 text-ink"
                          title={stream.title}
                        >
                          {stream.title}
                        </h4>

                        {technicalTags.length ? (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {technicalTags.map((tag) => (
                              <span
                                className="rounded-md border border-line bg-surface-strong/60 px-2 py-1 text-xs font-bold text-muted"
                                key={tag}
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        ) : null}

                        <dl className="mt-auto grid grid-cols-3 divide-x divide-line overflow-hidden rounded-xl border border-line bg-page/35">
                          <div className="min-w-0 px-3 py-2.5">
                            <dt className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-faint">
                              <Users className="size-3" aria-hidden="true" />
                              Seeds
                            </dt>
                            <dd className="mt-1 truncate text-xs font-extrabold tabular-nums text-ink">
                              {stream.seeders ?? "--"}
                            </dd>
                          </div>
                          <div className="min-w-0 px-3 py-2.5">
                            <dt className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-faint">
                              <HardDrive className="size-3" aria-hidden="true" />
                              Size
                            </dt>
                            <dd className="mt-1 truncate text-xs font-extrabold tabular-nums text-ink">
                              {stream.size ?? "--"}
                            </dd>
                          </div>
                          <div className="min-w-0 px-3 py-2.5">
                            <dt className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-faint">
                              <Server className="size-3" aria-hidden="true" />
                              Indexer
                            </dt>
                            <dd
                              className="mt-1 truncate text-xs font-extrabold text-ink"
                              title={stream.provider}
                            >
                              {stream.provider ?? (directUrl ? "Direct" : "Unknown")}
                            </dd>
                          </div>
                        </dl>

                        <button
                          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-xs font-extrabold text-white transition hover:bg-accent-bright hover:text-page disabled:cursor-not-allowed disabled:opacity-40"
                          type="button"
                          disabled={!playable}
                          onClick={() => setSelectedStream(stream)}
                        >
                          <Play className="size-3.5 fill-current" />
                          {playing ? "Now playing" : playable ? "Play this source" : "Unavailable"}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
          ) : null}
        </div>

        <p className="mt-5 text-xs leading-5 text-faint">
          English audio sources are ranked by seed availability, up to four per quality. Sources
          that need conversion use AAC audio for browser playback.
        </p>
      </div>
    </dialog>
  );
}
