import { HttpService } from "@nestjs/axios";
import {
  BadGatewayException,
  GatewayTimeoutException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { isAxiosError } from "axios";
import { firstValueFrom, map } from "rxjs";

import {
  TmdbCredits,
  TmdbDiscoverParams,
  TmdbExternalIds,
  TmdbGenre,
  TmdbGenresResponse,
  TmdbMovie,
  TmdbMovieDetails,
  TmdbPaginatedResponse,
  TmdbSearchParams,
  TmdbTrendingParams,
} from "./interfaces/tmdb.interfaces";

@Injectable()
export class TmdbClient {
  private readonly logger = new Logger(TmdbClient.name);
  private readonly baseUrl: string;
  private readonly apiKey?: string;
  private readonly accessToken?: string;
  private readonly defaultLanguage = "en-US";

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get<string>("tmdb.baseUrl") || "https://api.themoviedb.org/3";
    const configuredApiKey = this.configService.get<string>("tmdb.apiKey");
    const configuredAccessToken = this.configService.get<string>("tmdb.accessToken");

    // Existing installations may have stored a v4 read-access token under TMDB_API_KEY.
    this.accessToken =
      configuredAccessToken || (configuredApiKey?.startsWith("eyJ") ? configuredApiKey : undefined);
    this.apiKey = this.accessToken ? undefined : configuredApiKey;

    if (!this.apiKey && !this.accessToken) {
      throw new Error("TMDB_API_KEY or TMDB_ACCESS_TOKEN is required");
    }
  }

  async getGenres(): Promise<TmdbGenre[]> {
    const response = await this.request<TmdbGenresResponse>("/genre/movie/list");
    return response.genres;
  }

  async getPopularMovies(
    params: TmdbDiscoverParams = {},
  ): Promise<TmdbPaginatedResponse<TmdbMovie>> {
    return this.request<TmdbPaginatedResponse<TmdbMovie>>("/movie/popular", { params });
  }

  async getTrendingMovies(params: TmdbTrendingParams): Promise<TmdbPaginatedResponse<TmdbMovie>> {
    const { timeWindow, language, page } = params;
    return this.request<TmdbPaginatedResponse<TmdbMovie>>(`/trending/movie/${timeWindow}`, {
      params: { language: language || this.defaultLanguage, page },
    });
  }

  async searchMovies(params: TmdbSearchParams): Promise<TmdbPaginatedResponse<TmdbMovie>> {
    return this.request<TmdbPaginatedResponse<TmdbMovie>>("/search/movie", { params });
  }

  async discoverMovies(params: TmdbDiscoverParams): Promise<TmdbPaginatedResponse<TmdbMovie>> {
    return this.request<TmdbPaginatedResponse<TmdbMovie>>("/discover/movie", { params });
  }

  async getMovieDetails(movieId: number, appendToResponse?: string): Promise<TmdbMovieDetails> {
    const params = appendToResponse ? { append_to_response: appendToResponse } : {};
    return this.request<TmdbMovieDetails>(`/movie/${movieId}`, { params });
  }

  async getMovieCredits(movieId: number): Promise<TmdbCredits> {
    return this.request<TmdbCredits>(`/movie/${movieId}/credits`);
  }

  async getSimilarMovies(movieId: number, page = 1): Promise<TmdbPaginatedResponse<TmdbMovie>> {
    return this.request<TmdbPaginatedResponse<TmdbMovie>>(`/movie/${movieId}/similar`, {
      params: { page },
    });
  }

  async getMovieExternalIds(movieId: number): Promise<TmdbExternalIds> {
    return this.request<TmdbExternalIds>(`/movie/${movieId}/external_ids`);
  }

  private async request<T>(
    endpoint: string,
    options: {
      params?: Record<string, unknown> | TmdbDiscoverParams | TmdbSearchParams | TmdbTrendingParams;
    } = {},
  ): Promise<T> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const { params = {} } = options;

      this.logger.debug(`Requesting: ${url}`);

      const response = await firstValueFrom(
        this.httpService
          .get<T>(url, {
            headers: this.accessToken ? { Authorization: `Bearer ${this.accessToken}` } : undefined,
            params: {
              ...(this.apiKey ? { api_key: this.apiKey } : {}),
              language: this.defaultLanguage,
              ...params,
            },
            timeout: 10000,
          })
          .pipe(map((res) => res.data)),
      );

      return response;
    } catch (error) {
      if (isAxiosError(error)) {
        const status = error.response?.status;
        const data = error.response?.data as { status_message?: string } | undefined;
        const message = data?.status_message || error.message;

        this.logger.error(`TMDB Request Failed [${status}]: ${message}`);

        if (status === 401) {
          throw new BadGatewayException("Movie provider authentication failed");
        }
        if (status === 404) {
          throw new NotFoundException("Movie resource not found");
        }
        if (status === 429) {
          throw new ServiceUnavailableException("Movie provider rate limit exceeded");
        }
        if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
          throw new GatewayTimeoutException("Movie provider timed out");
        }
        throw new BadGatewayException("Movie provider request failed");
      }
      throw error;
    }
  }
}
