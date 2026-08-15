import { Injectable, Logger } from "@nestjs/common";
import { CacheService } from "src/common/cache/cache.service";

import { TmdbService } from "src/modules/tmdb/tmdb.service";
import {
  MovieStream,
  NormalizedStreamsResponse,
  TorrentioStream,
  TorrentioStreamParams,
} from "./interfaces/torrentio.interfaces";
import { TorrentioClient } from "./torrentio.client";

@Injectable()
export class TorrentioService {
  private readonly logger = new Logger(TorrentioService.name);
  private readonly cacheTtl = 1800; // 30 min

  constructor(
    private readonly torrentioClient: TorrentioClient,
    private readonly tmdbService: TmdbService,
    private readonly cacheService: CacheService,
  ) {}

  async getMovieStreams(tmdbMovieId: number): Promise<NormalizedStreamsResponse> {
    const cacheKey = `torrentio:movie:${tmdbMovieId}`;

    return this.cacheService.getOrSet<NormalizedStreamsResponse>(
      cacheKey,
      async () => {
        // Get the IMDB ID from TMDB
        const externalIds = await this.tmdbService.getMovieExternalIds(tmdbMovieId);
        const imdbId = externalIds.imdb_id;

        if (!imdbId) {
          this.logger.warn(`No IMDB ID found for TMDB movie ${tmdbMovieId}`);
          return { movieId: tmdbMovieId, streams: [] };
        }

        const params: TorrentioStreamParams = {
          type: "movie",
          id: imdbId,
        };

        const response = await this.torrentioClient.getStreams(params);
        const normalizedStreams = this.normalizeStreams(response.streams);

        return {
          movieId: tmdbMovieId,
          streams: normalizedStreams,
        };
      },
      this.cacheTtl,
    );
  }

  private normalizeStreams(streams: TorrentioStream[]): MovieStream[] {
    return streams.map((stream, index) => {
      const quality = this.extractQuality(stream.title);
      const type = stream.infoHash ? "torrent" : this.extractType(stream.url);
      const infoHash = stream.infoHash?.toLowerCase() || this.extractInfoHash(stream.url);
      const fileIndex = stream.fileIdx ?? this.extractFileIndex(stream.url);
      const size = stream.behaviorHints?.videoSize
        ? this.formatSize(stream.behaviorHints.videoSize)
        : undefined;
      const seeders = this.extractSeeders(stream.name);

      return {
        id: `stream-${index}`,
        title: stream.title,
        quality,
        type,
        url: stream.url,
        infoHash,
        fileIndex,
        size,
        seeders,
      };
    });
  }

  private extractQuality(title: string): string | undefined {
    const qualityMatch = title.match(/(4K|2160p|1080p|720p|480p|360p|2160|1080|720|480|360)/i);
    return qualityMatch ? qualityMatch[1].toUpperCase() : undefined;
  }

  private extractType(url?: string): string | undefined {
    if (!url) return undefined;
    if (url.startsWith("magnet:")) return "torrent";
    if (url.includes(".torrent")) return "torrent";
    if (url.includes("http")) return "http";
    return undefined;
  }

  private extractInfoHash(url?: string): string | undefined {
    if (!url) return undefined;
    // Extract info hash from magnet URI
    const magnetMatch = url.match(/btih:([a-fA-F0-9]{40})/);
    if (magnetMatch) return magnetMatch[1].toLowerCase();

    // Extract from .torrent URL if possible
    const torrentMatch = url.match(/([a-fA-F0-9]{40})(?:\.torrent)?/);
    if (torrentMatch) return torrentMatch[1].toLowerCase();

    return undefined;
  }

  private extractFileIndex(url?: string): number | undefined {
    if (!url) return undefined;
    const fileIndexMatch = url.match(/[?&]fileIndex=(\d+)/);
    return fileIndexMatch ? Number.parseInt(fileIndexMatch[1], 10) : undefined;
  }

  private formatSize(bytes: number): string {
    if (bytes >= 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    }
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    }
    if (bytes >= 1024) {
      return `${(bytes / 1024).toFixed(2)} KB`;
    }
    return `${bytes} B`;
  }

  private extractSeeders(name: string): number | undefined {
    const seederMatch = name.match(/👤\s*(\d+)/) || name.match(/(\d+)\s*seeders?/i);
    return seederMatch ? Number.parseInt(seederMatch[1], 10) : undefined;
  }
}
