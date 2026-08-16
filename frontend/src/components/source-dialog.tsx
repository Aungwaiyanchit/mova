import { useQuery } from "@tanstack/react-query";
import { Check, Copy, ExternalLink, RadioTower, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import { magnetUrl } from "../lib/format";
import type { MovieStream } from "../types/api";
import { StatePanel } from "./state-panel";

const SOURCE_PLACEHOLDERS = ["source-one", "source-two", "source-three", "source-four"];

function playableUrl(stream: MovieStream) {
  return stream.url || (stream.infoHash ? magnetUrl(stream.infoHash) : undefined);
}

export function SourceDialog({
  movieId,
  movieTitle,
  open,
  onClose,
}: {
  movieId: number;
  movieTitle: string;
  open: boolean;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [copiedId, setCopiedId] = useState<string>();
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

  async function copySource(stream: MovieStream) {
    const url = playableUrl(stream);
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopiedId(stream.id);
    window.setTimeout(() => setCopiedId(undefined), 1600);
  }

  const streams = streamsQuery.data?.streams ?? [];

  return (
    <dialog
      className="fixed inset-x-0 bottom-0 top-auto m-0 max-h-[85vh] w-full max-w-none overflow-y-auto rounded-t-3xl border border-line bg-page-raised p-0 text-ink shadow-2xl backdrop:bg-black/75 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:max-h-[80vh] sm:w-[min(42rem,calc(100%-2rem))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl"
      ref={dialogRef}
      aria-labelledby="source-dialog-title"
      onClose={onClose}
    >
      <div className="sticky top-0 z-10 flex items-start justify-between border-b border-line bg-page-raised/95 px-5 py-5 backdrop-blur sm:px-7">
        <div>
          <p className="text-[0.65rem] font-extrabold uppercase tracking-[0.22em] text-accent-bright">
            Available sources
          </p>
          <h2 className="mt-1 font-display text-xl font-bold" id="source-dialog-title">
            {movieTitle}
          </h2>
        </div>
        <button
          className="grid size-9 place-items-center rounded-full border border-line text-muted hover:text-ink"
          type="button"
          aria-label="Close sources"
          onClick={onClose}
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="p-5 sm:p-7">
        {streamsQuery.isPending ? (
          <div className="space-y-3" role="status" aria-label="Loading sources">
            {SOURCE_PLACEHOLDERS.map((placeholder) => (
              <div className="h-24 animate-pulse rounded-xl bg-surface" key={placeholder} />
            ))}
          </div>
        ) : null}
        {streamsQuery.isError ? (
          <StatePanel
            kind="error"
            title="Sources are offline"
            message="The source provider did not respond. Movie details are still available, and you can try this again shortly."
            actionLabel="Try sources again"
            onAction={() => streamsQuery.refetch()}
          />
        ) : null}
        {streamsQuery.isSuccess && streams.length === 0 ? (
          <StatePanel
            title="No sources found"
            message="There are no sources listed for this title right now."
          />
        ) : null}
        {streams.length ? (
          <div className="space-y-3">
            {streams.map((stream) => {
              const url = playableUrl(stream);
              return (
                <article className="rounded-xl border border-line bg-surface p-4" key={stream.id}>
                  <div className="flex items-start gap-3">
                    <span className="mt-1 grid size-9 shrink-0 place-items-center rounded-full bg-accent/15 text-accent-bright">
                      <RadioTower className="size-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap gap-2 text-[0.65rem] font-extrabold uppercase tracking-wider">
                        {stream.quality ? (
                          <span className="rounded bg-accent px-2 py-1 text-white">
                            {stream.quality}
                          </span>
                        ) : null}
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
                  {url ? (
                    <div className="mt-4 flex gap-2 border-t border-line pt-3">
                      <a
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-accent px-3 py-2 text-xs font-bold text-white hover:bg-accent-bright hover:text-page"
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open source
                        <ExternalLink className="size-3.5" />
                      </a>
                      <button
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-line px-3 py-2 text-xs font-bold text-muted hover:border-accent hover:text-ink"
                        type="button"
                        onClick={() => copySource(stream)}
                      >
                        {copiedId === stream.id ? (
                          <Check className="size-3.5" />
                        ) : (
                          <Copy className="size-3.5" />
                        )}
                        {copiedId === stream.id ? "Copied" : "Copy"}
                      </button>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        ) : null}
        <p className="mt-5 text-xs leading-5 text-faint">
          Sources open in a compatible external application. MOVA does not pretend torrent sources
          are browser-playable video.
        </p>
      </div>
    </dialog>
  );
}
