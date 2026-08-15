import { Injectable, Logger } from "@nestjs/common";
import { CacheService } from "src/common/cache/cache.service";

import {
  TmdbCredits,
  TmdbDiscoverParams,
  TmdbExternalIds,
  TmdbGenre,
  TmdbMovie,
  TmdbMovieDetails,
  TmdbPaginatedResponse,
  TmdbSearchParams,
  TmdbTrendingParams,
} from "./interfaces/tmdb.interfaces";
import { TmdbClient } from "./tmdb.client";

@Injectable()
export class TmdbService {
  private readonly logger = new Logger(TmdbService.name);
  private readonly cacheTtl: number;

  constructor(
    private readonly tmdbClient: TmdbClient,
    private readonly cacheService: CacheService,
  ) {
    this.cacheTtl = 3600; // 1 hour default
  }

  async getGenres(): Promise<TmdbGenre[]> {
    const cacheKey = "tmdb:genres";
    return this.cacheService.getOrSet<TmdbGenre[]>(
      cacheKey,
      () => this.tmdbClient.getGenres(),
      this.cacheTtl,
    );
  }

  async getPopularMovies(
    params: TmdbDiscoverParams = {},
  ): Promise<TmdbPaginatedResponse<TmdbMovie>> {
    const cacheKey = `tmdb:popular:${JSON.stringify(params)}`;
    return this.cacheService.getOrSet<TmdbPaginatedResponse<TmdbMovie>>(
      cacheKey,
      () => this.tmdbClient.getPopularMovies(params),
      1800, // 30 min for popular
    );
  }

  async getTrendingMovies(params: TmdbTrendingParams): Promise<TmdbPaginatedResponse<TmdbMovie>> {
    const cacheKey = `tmdb:trending:${params.timeWindow}:${params.language || "en-US"}:${params.page || 1}`;
    return this.cacheService.getOrSet<TmdbPaginatedResponse<TmdbMovie>>(
      cacheKey,
      () => this.tmdbClient.getTrendingMovies(params),
      1800, // 30 min for trending
    );
  }

  async searchMovies(params: TmdbSearchParams): Promise<TmdbPaginatedResponse<TmdbMovie>> {
    const cacheKey = `tmdb:search:${JSON.stringify(params)}`;
    return this.cacheService.getOrSet<TmdbPaginatedResponse<TmdbMovie>>(
      cacheKey,
      () => this.tmdbClient.searchMovies(params),
      300, // 5 min for search
    );
  }

  async discoverMovies(params: TmdbDiscoverParams): Promise<TmdbPaginatedResponse<TmdbMovie>> {
    const cacheKey = `tmdb:discover:${JSON.stringify(params)}`;
    return this.cacheService.getOrSet<TmdbPaginatedResponse<TmdbMovie>>(
      cacheKey,
      () => this.tmdbClient.discoverMovies(params),
      1800,
    );
  }

  async getMovieDetails(movieId: number): Promise<TmdbMovieDetails> {
    const cacheKey = `tmdb:movie:${movieId}:details`;
    const appendToResponse = "credits,similar";
    return this.cacheService.getOrSet<TmdbMovieDetails>(
      cacheKey,
      () => this.tmdbClient.getMovieDetails(movieId, appendToResponse),
      this.cacheTtl,
    );
  }

  async getMovieCredits(movieId: number): Promise<TmdbCredits> {
    const cacheKey = `tmdb:movie:${movieId}:credits`;
    return this.cacheService.getOrSet<TmdbCredits>(
      cacheKey,
      () => this.tmdbClient.getMovieCredits(movieId),
      this.cacheTtl,
    );
  }

  async getSimilarMovies(movieId: number, page = 1): Promise<TmdbPaginatedResponse<TmdbMovie>> {
    const cacheKey = `tmdb:movie:${movieId}:similar:${page}`;
    return this.cacheService.getOrSet<TmdbPaginatedResponse<TmdbMovie>>(
      cacheKey,
      () => this.tmdbClient.getSimilarMovies(movieId, page),
      this.cacheTtl,
    );
  }

  async getMovieExternalIds(movieId: number): Promise<TmdbExternalIds> {
    const cacheKey = `tmdb:movie:${movieId}:external_ids`;
    return this.cacheService.getOrSet<TmdbExternalIds>(
      cacheKey,
      () => this.tmdbClient.getMovieExternalIds(movieId),
      this.cacheTtl,
    );
  }

  getImageUrl(
    path: string | null,
    size: "w92" | "w154" | "w185" | "w342" | "w500" | "w780" | "original" = "w500",
  ): string {
    if (!path) return "";
    return `https://image.tmdb.org/t/p/${size}${path}`;
  }

  getBackdropUrl(
    path: string | null,
    size: "w300" | "w780" | "w1280" | "original" = "w1280",
  ): string {
    if (!path) return "";
    return `https://image.tmdb.org/t/p/${size}${path}`;
  }

  getProfileUrl(path: string | null, size: "w45" | "w185" | "h632" | "original" = "w185"): string {
    if (!path) return "";
    return `https://image.tmdb.org/t/p/${size}${path}`;
  }
}
