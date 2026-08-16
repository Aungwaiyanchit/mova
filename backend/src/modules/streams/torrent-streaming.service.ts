import { tmpdir } from "node:os";
import { extname, join } from "node:path";
import { Readable } from "node:stream";
import {
  GatewayTimeoutException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  OnModuleDestroy,
  UnprocessableEntityException,
} from "@nestjs/common";
import WebTorrent = require("webtorrent");
import { StreamsService } from "./streams.service";
import {
  TORRENT_IDLE_TTL_MS,
  TORRENT_METADATA_TIMEOUT_MS,
  TORRENT_SWEEP_INTERVAL_MS,
  TORRENT_TRACKERS,
  VIDEO_MIME_TYPES,
} from "./torrent-streaming.constants";

interface ByteRange {
  start: number;
  end: number;
  statusCode: 200 | 206;
}

export interface PreparedVideoStream {
  stream: Readable;
  statusCode: 200 | 206;
  headers: Record<string, string>;
}

export interface TorrentStreamStatus {
  downloadSpeed: number;
}

export function parseByteRange(rangeHeader: string | undefined, size: number): ByteRange {
  if (!rangeHeader) return { start: 0, end: size - 1, statusCode: 200 };

  const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());
  if (!match || (!match[1] && !match[2])) {
    throw new HttpException(
      "Requested range is not satisfiable",
      HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE,
    );
  }

  const startValue = match[1] ? Number(match[1]) : undefined;
  const endValue = match[2] ? Number(match[2]) : undefined;
  if (
    (startValue !== undefined && !Number.isSafeInteger(startValue)) ||
    (endValue !== undefined && !Number.isSafeInteger(endValue))
  ) {
    throw new HttpException(
      "Requested range is not satisfiable",
      HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE,
    );
  }

  const start = startValue ?? Math.max(size - (endValue ?? 0), 0);
  const end = startValue === undefined ? size - 1 : Math.min(endValue ?? size - 1, size - 1);
  if (start < 0 || start >= size || end < start) {
    throw new HttpException(
      "Requested range is not satisfiable",
      HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE,
    );
  }

  return { start, end, statusCode: 206 };
}

export function selectVideoFile(
  files: WebTorrent.TorrentFile[],
  fileIndex?: number,
): WebTorrent.TorrentFile | undefined {
  const requestedFile = fileIndex === undefined ? undefined : files[fileIndex];
  if (requestedFile && VIDEO_MIME_TYPES[extname(requestedFile.name).toLowerCase()]) {
    return requestedFile;
  }

  return files
    .filter((file) => VIDEO_MIME_TYPES[extname(file.name).toLowerCase()])
    .sort((first, second) => second.length - first.length)[0];
}

@Injectable()
export class TorrentStreamingService implements OnModuleDestroy {
  private readonly logger = new Logger(TorrentStreamingService.name);
  private readonly pendingTorrents = new Map<string, Promise<WebTorrent.Torrent>>();
  private readonly activeReaders = new Map<string, number>();
  private readonly lastAccessed = new Map<string, number>();
  private readonly sweepTimer: NodeJS.Timeout;
  private client?: WebTorrent.Instance;

  constructor(private readonly streamsService: StreamsService) {
    this.sweepTimer = setInterval(() => this.removeIdleTorrents(), TORRENT_SWEEP_INTERVAL_MS);
    this.sweepTimer.unref();
  }

  async prepareVideoStream(
    movieId: number,
    infoHash: string,
    fileIndex: number | undefined,
    rangeHeader: string | undefined,
  ): Promise<PreparedVideoStream> {
    const source = await this.streamsService.resolveTorrentSource(movieId, infoHash, fileIndex);
    const torrent = await this.getTorrent(infoHash);
    const file = selectVideoFile(torrent.files, source.fileIndex);
    if (!file) throw new UnprocessableEntityException("This source does not contain a video file");

    const range = parseByteRange(rangeHeader, file.length);
    const stream = file.createReadStream({ start: range.start, end: range.end }) as Readable;
    const contentLength = range.end - range.start + 1;
    const extension = extname(file.name).toLowerCase();

    this.retainReader(infoHash, stream);

    const headers: Record<string, string> = {
      "Accept-Ranges": "bytes",
      "Cache-Control": "no-store",
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(file.name)}`,
      "Content-Length": String(contentLength),
      "Content-Type": VIDEO_MIME_TYPES[extension] ?? "application/octet-stream",
      "X-Accel-Buffering": "no",
    };
    if (range.statusCode === 206) {
      headers["Content-Range"] = `bytes ${range.start}-${range.end}/${file.length}`;
    }

    return { stream, statusCode: range.statusCode, headers };
  }

  getStreamStatus(infoHash: string): TorrentStreamStatus {
    const torrent = this.client?.get(infoHash);
    if (!torrent) return { downloadSpeed: 0 };

    return { downloadSpeed: torrent.downloadSpeed };
  }

  onModuleDestroy(): void {
    clearInterval(this.sweepTimer);
    this.client?.destroy((error) => {
      if (error) this.logger.warn(`Torrent client shutdown failed: ${String(error)}`);
    });
    this.client = undefined;
  }

  private getClient(): WebTorrent.Instance {
    if (this.client) return this.client;

    this.client = new WebTorrent({ lsd: false, utp: false });
    this.client.on("error", (error) => this.logger.error(`Torrent client error: ${String(error)}`));
    return this.client;
  }

  private getTorrent(infoHash: string): Promise<WebTorrent.Torrent> {
    const client = this.getClient();
    const existing = client.get(infoHash);
    if (existing?.ready) return Promise.resolve(existing);

    const pending = this.pendingTorrents.get(infoHash);
    if (pending) return pending;

    const torrentPromise = new Promise<WebTorrent.Torrent>((resolve, reject) => {
      const torrent =
        existing ||
        client.add(infoHash, {
          announce: [...TORRENT_TRACKERS],
          destroyStoreOnDestroy: true,
          path: join(tmpdir(), "mova-torrents", infoHash),
          strategy: "sequential",
        });
      const timeout = setTimeout(() => {
        cleanup();
        this.removeTorrent(infoHash);
        reject(new GatewayTimeoutException("Torrent metadata timed out"));
      }, TORRENT_METADATA_TIMEOUT_MS);

      const cleanup = () => {
        clearTimeout(timeout);
        torrent.removeListener("ready", onReady);
        torrent.removeListener("error", onError);
      };
      const onReady = () => {
        cleanup();
        this.lastAccessed.set(infoHash, Date.now());
        resolve(torrent);
      };
      const onError = (error: Error | string) => {
        cleanup();
        this.removeTorrent(infoHash);
        reject(error instanceof Error ? error : new Error(error));
      };

      torrent.once("ready", onReady);
      torrent.once("error", onError);
      if (torrent.ready) onReady();
    });

    this.pendingTorrents.set(infoHash, torrentPromise);
    void torrentPromise.then(
      () => this.pendingTorrents.delete(infoHash),
      () => this.pendingTorrents.delete(infoHash),
    );
    return torrentPromise;
  }

  private retainReader(infoHash: string, stream: Readable): void {
    this.activeReaders.set(infoHash, (this.activeReaders.get(infoHash) ?? 0) + 1);
    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      const readers = Math.max((this.activeReaders.get(infoHash) ?? 1) - 1, 0);
      if (readers) this.activeReaders.set(infoHash, readers);
      else this.activeReaders.delete(infoHash);
      this.lastAccessed.set(infoHash, Date.now());
    };
    stream.once("close", release);
    stream.once("end", release);
    stream.once("error", release);
  }

  private removeIdleTorrents(): void {
    const now = Date.now();
    for (const [infoHash, lastAccessed] of this.lastAccessed) {
      if (!this.activeReaders.has(infoHash) && now - lastAccessed >= TORRENT_IDLE_TTL_MS) {
        this.removeTorrent(infoHash);
      }
    }
  }

  private removeTorrent(infoHash: string): void {
    this.lastAccessed.delete(infoHash);
    const client = this.client;
    if (!client?.get(infoHash)) return;
    client.remove(infoHash, { destroyStore: true }, (error) => {
      if (error) this.logger.warn(`Could not remove torrent ${infoHash}: ${String(error)}`);
    });
  }
}
