import { ChildProcessWithoutNullStreams, spawn } from "node:child_process";
import { createReadStream } from "node:fs";
import { mkdir, readFile, rm, stat } from "node:fs/promises";
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
  ServiceUnavailableException,
  UnprocessableEntityException,
} from "@nestjs/common";
import ffmpegInstaller = require("@ffmpeg-installer/ffmpeg");
import WebTorrent = require("webtorrent");
import { StreamsService } from "./streams.service";
import {
  HLS_READY_TIMEOUT_MS,
  MAX_ACTIVE_TORRENTS,
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

interface HlsSession {
  directory: string;
  lastAccessed: number;
  process: ChildProcessWithoutNullStreams;
  ready: Promise<void>;
  source: Readable;
  stopped: boolean;
}

const HLS_ASSET_PATTERN = /^(?:playlist\.m3u8|segment-\d{5}\.ts)$/;

export function hlsAssetContentType(asset: string): string | undefined {
  if (asset === "playlist.m3u8") return "application/vnd.apple.mpegurl";
  if (/^segment-\d{5}\.ts$/.test(asset)) return "video/mp2t";
  return undefined;
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
  private readonly pendingHlsSessions = new Map<string, Promise<HlsSession>>();
  private readonly activeReaders = new Map<string, number>();
  private readonly hlsSessions = new Map<string, HlsSession>();
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

  async prepareHlsAsset(
    movieId: number,
    infoHash: string,
    fileIndex: number | undefined,
    asset: string,
  ): Promise<PreparedVideoStream> {
    const contentType = hlsAssetContentType(asset);
    if (!contentType || !HLS_ASSET_PATTERN.test(asset)) {
      throw new UnprocessableEntityException("Invalid HLS asset");
    }

    let session = this.hlsSessions.get(infoHash);
    if (!session) {
      if (asset !== "playlist.m3u8") throw new UnprocessableEntityException("HLS session expired");
      session = await this.getOrCreateHlsSession(movieId, infoHash, fileIndex);
    }
    session.lastAccessed = Date.now();
    await session.ready;

    const assetPath = join(session.directory, asset);
    if (asset === "playlist.m3u8") {
      const playlist = await readFile(assetPath);
      return {
        stream: Readable.from(playlist),
        statusCode: 200,
        headers: {
          "Cache-Control": "no-store",
          "Content-Length": String(playlist.length),
          "Content-Type": contentType,
        },
      };
    }

    const assetStats = await stat(assetPath).catch(() => undefined);
    if (!assetStats?.isFile()) throw new UnprocessableEntityException("HLS asset is not ready");

    return {
      stream: createReadStream(assetPath),
      statusCode: 200,
      headers: {
        "Cache-Control": "public, max-age=3600",
        "Content-Length": String(assetStats.size),
        "Content-Type": contentType,
      },
    };
  }

  onModuleDestroy(): void {
    clearInterval(this.sweepTimer);
    for (const infoHash of this.hlsSessions.keys()) this.removeHlsSession(infoHash);
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

    if (client.torrents.length >= MAX_ACTIVE_TORRENTS) {
      return Promise.reject(
        new ServiceUnavailableException("Stream capacity is exhausted, try again later"),
      );
    }

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
    for (const [infoHash, session] of this.hlsSessions) {
      if (now - session.lastAccessed >= TORRENT_IDLE_TTL_MS) this.removeHlsSession(infoHash);
    }
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

  private async startHlsSession(
    movieId: number,
    infoHash: string,
    fileIndex: number | undefined,
  ): Promise<HlsSession> {
    const source = await this.streamsService.resolveTorrentSource(movieId, infoHash, fileIndex);
    const torrent = await this.getTorrent(infoHash);
    const file = selectVideoFile(torrent.files, source.fileIndex);
    if (!file) throw new UnprocessableEntityException("This source does not contain a video file");

    const directory = join(tmpdir(), "mova-hls", infoHash);
    await rm(directory, { force: true, recursive: true });
    await mkdir(directory, { recursive: true });
    const input = file.createReadStream() as Readable;
    this.retainReader(infoHash, input);

    const process = spawn(
      ffmpegInstaller.path,
      [
        "-hide_banner",
        "-loglevel",
        "warning",
        "-fflags",
        "+genpts",
        "-i",
        "pipe:0",
        "-map",
        "0:v:0",
        "-map",
        "0:a:0?",
        "-c:v",
        "copy",
        "-c:a",
        "aac",
        "-b:a",
        "192k",
        "-ac",
        "2",
        "-max_muxing_queue_size",
        "2048",
        "-f",
        "hls",
        "-hls_time",
        "4",
        "-hls_list_size",
        "0",
        "-hls_playlist_type",
        "event",
        "-hls_flags",
        "independent_segments+temp_file",
        "-hls_segment_filename",
        join(directory, "segment-%05d.ts"),
        join(directory, "playlist.m3u8"),
      ],
      { stdio: ["pipe", "pipe", "pipe"] },
    );
    const session = {
      directory,
      lastAccessed: Date.now(),
      process,
      ready: Promise.resolve(),
      source: input,
      stopped: false,
    } satisfies HlsSession;
    session.ready = this.waitForHlsPlaylist(infoHash, session);
    this.hlsSessions.set(infoHash, session);

    input.pipe(process.stdin);
    process.stdin.on("error", (error: NodeJS.ErrnoException) => {
      if (error.code !== "EPIPE" && !session.stopped) {
        this.logger.warn(`FFmpeg input failed for ${infoHash}: ${error.message}`);
      }
    });
    process.stderr.on("data", (chunk: Buffer) => {
      const message = chunk.toString().trim();
      if (message) this.logger.debug(`FFmpeg ${infoHash}: ${message}`);
    });
    process.once("error", (error) => {
      this.logger.error(`FFmpeg failed for ${infoHash}: ${error.message}`);
    });
    process.once("close", (code) => {
      if (!session.stopped && code !== 0) {
        this.logger.warn(`FFmpeg exited for ${infoHash} with code ${String(code)}`);
      }
    });

    return session;
  }

  private getOrCreateHlsSession(
    movieId: number,
    infoHash: string,
    fileIndex: number | undefined,
  ): Promise<HlsSession> {
    const pending = this.pendingHlsSessions.get(infoHash);
    if (pending) return pending;

    const sessionPromise = this.startHlsSession(movieId, infoHash, fileIndex);
    this.pendingHlsSessions.set(infoHash, sessionPromise);
    void sessionPromise.then(
      () => this.pendingHlsSessions.delete(infoHash),
      () => this.pendingHlsSessions.delete(infoHash),
    );
    return sessionPromise;
  }

  private async waitForHlsPlaylist(infoHash: string, session: HlsSession): Promise<void> {
    const playlist = join(session.directory, "playlist.m3u8");
    const deadline = Date.now() + HLS_READY_TIMEOUT_MS;
    while (Date.now() < deadline) {
      const playlistStats = await stat(playlist).catch(() => undefined);
      if (playlistStats?.isFile() && playlistStats.size > 0) return;
      if (session.process.exitCode !== null) break;
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    this.removeHlsSession(infoHash);
    throw new GatewayTimeoutException("Browser-compatible stream preparation timed out");
  }

  private removeHlsSession(infoHash: string): void {
    const session = this.hlsSessions.get(infoHash);
    if (!session) return;
    this.hlsSessions.delete(infoHash);
    this.removeHlsSessionBySession(session);
  }

  private removeHlsSessionBySession(session: HlsSession): void {
    session.stopped = true;
    session.source.destroy();
    if (session.process.exitCode === null) session.process.kill("SIGKILL");
    void rm(session.directory, { force: true, recursive: true });
  }
}
