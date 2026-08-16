import { useQuery } from "@tanstack/react-query";
import { Play, RadioTower, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import {
  directStreamUrl,
  groupStreamsByQuality,
  type StreamQuality,
  streamQuality,
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

  function closeDialog() {
    setSelectedQuality(undefined);
    setSelectedStream(undefined);
    onClose();
  }

  const streams = streamsQuery.data?.streams ?? [];
  const groups = groupStreamsByQuality(streams);
  const activeQuality = selectedQuality ?? groups[0]?.quality;
  const activeGroup = groups.find((group) => group.quality === activeQuality);
  const selectedUrl = selectedStream
    ? (directStreamUrl(selectedStream) ??
      (selectedStream.infoHash
        ? api.getStreamVideoUrl(movieId, selectedStream.infoHash, selectedStream.fileIndex)
        : undefined))
    : undefined;

  return (
    <dialog
      className="fixed inset-x-0 bottom-0 top-auto m-0 max-h-[92vh] w-full max-w-none overflow-y-auto rounded-t-3xl border border-line bg-page-raised p-0 text-ink shadow-2xl backdrop:bg-black/80 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:w-[min(64rem,calc(100%-2rem))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl"
      ref={dialogRef}
      aria-labelledby="source-dialog-title"
      onClose={closeDialog}
    >
      <div className="sticky top-0 z-20 flex items-start justify-between border-b border-line bg-page-raised/95 px-5 py-5 backdrop-blur sm:px-7">
        <div>
          <p className="text-[0.65rem] font-extrabold uppercase tracking-[0.22em] text-accent-bright">
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
        {selectedStream && selectedUrl ? (
          <VideoPlayer
            infoHash={selectedStream.infoHash}
            movieId={movieId}
            movieTitle={movieTitle}
            poster={poster}
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
              <p className="mt-1 text-xs text-white/55">Choose one of the ranked sources below.</p>
            </div>
          </div>
        )}

        <div className="mt-7">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[0.65rem] font-extrabold uppercase tracking-[0.22em] text-accent-bright">
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
                title="No sources found"
                message="There are no sources listed for this title right now."
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
                    <span className="ml-2 opacity-60">{group.streams.length}</span>
                  </button>
                ))}
              </fieldset>

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {activeGroup?.streams.map((stream) => {
                  const directUrl = directStreamUrl(stream);
                  const playable = Boolean(directUrl || stream.infoHash);
                  const playing = selectedStream?.id === stream.id;

                  return (
                    <article
                      className={`rounded-xl border bg-surface p-4 transition ${
                        playing ? "border-accent" : "border-line"
                      }`}
                      key={stream.id}
                    >
                      <div className="flex items-start gap-3">
                        <span className="mt-1 grid size-9 shrink-0 place-items-center rounded-full bg-accent/15 text-accent-bright">
                          <RadioTower className="size-4" aria-hidden="true" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap gap-2 text-[0.65rem] font-extrabold uppercase tracking-wider">
                            <span className="rounded bg-accent px-2 py-1 text-white">
                              {streamQuality(stream)}
                            </span>
                            <span className="rounded bg-surface-strong px-2 py-1 text-muted">
                              {directUrl ? "Direct" : "Torrent"}
                            </span>
                            {stream.size ? (
                              <span className="rounded bg-surface-strong px-2 py-1 text-muted">
                                {stream.size}
                              </span>
                            ) : null}
                            {stream.seeders !== undefined ? (
                              <span className="rounded bg-surface-strong px-2 py-1 text-muted">
                                {stream.seeders} seeders
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted">
                            {stream.title}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 border-t border-line pt-3">
                        <button
                          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-3 py-2 text-xs font-bold text-white hover:bg-accent-bright hover:text-page disabled:cursor-not-allowed disabled:opacity-40"
                          type="button"
                          disabled={!playable}
                          onClick={() => setSelectedStream(stream)}
                        >
                          <Play className="size-3.5 fill-current" />
                          {playing ? "Playing" : playable ? "Play" : "Unavailable"}
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
          Up to four sources per quality are ranked by seed availability and streamed through MOVA.
        </p>
      </div>
    </dialog>
  );
}
