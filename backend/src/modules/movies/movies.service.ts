import { Injectable } from "@nestjs/common";

import {
  TmdbCastMember,
  TmdbMovie,
  TmdbMovieDetails,
} from "src/modules/tmdb/interfaces/tmdb.interfaces";
import { PaginatedResult, paginateTmdb } from "src/modules/tmdb/tmdb-pagination";
import { TmdbService } from "src/modules/tmdb/tmdb.service";
import { CastMemberResponseDto, MovieResponseDto } from "./dto/movie.dto";
import { formatMovieForList } from "./movie.mapper";

@Injectable()
export class MoviesService {
  constructor(private readonly tmdbService: TmdbService) {}

  async getMovies(
    page = 1,
    limit = 20,
    sort?: string,
    year?: number,
    genre?: number,
  ): Promise<PaginatedResult<TmdbMovie>> {
    return paginateTmdb(
      (providerPage) =>
        this.tmdbService.discoverMovies({
          page: providerPage,
          sort_by: sort || "popularity.desc",
          year: year?.toString(),
          with_genres: genre?.toString(),
        }),
      page,
      limit,
    );
  }

  async getPopularMovies(page = 1, limit = 20): Promise<PaginatedResult<TmdbMovie>> {
    return paginateTmdb(
      (providerPage) => this.tmdbService.getPopularMovies({ page: providerPage }),
      page,
      limit,
    );
  }

  async searchMovies(query: string, page = 1, limit = 20): Promise<PaginatedResult<TmdbMovie>> {
    return paginateTmdb(
      (providerPage) =>
        this.tmdbService.searchMovies({
          query,
          page: providerPage,
          language: "en-US",
          include_adult: false,
        }),
      page,
      limit,
    );
  }

  async getMovieDetails(movieId: number): Promise<TmdbMovieDetails> {
    return this.tmdbService.getMovieDetails(movieId);
  }

  async getMovieCast(movieId: number): Promise<TmdbCastMember[]> {
    const credits = await this.tmdbService.getMovieCredits(movieId);
    return credits.cast;
  }

  formatMovieForList(movie: TmdbMovie): MovieResponseDto {
    return formatMovieForList(movie);
  }

  formatCastMember(member: TmdbCastMember): CastMemberResponseDto {
    return {
      id: member.id,
      name: member.name,
      character: member.character,
      profile_image: member.profile_path
        ? this.tmdbService.getProfileUrl(member.profile_path, "w185")
        : "",
      department: member.known_for_department,
      order: member.order,
    };
  }

  formatMovieForDetail(movie: TmdbMovieDetails): {
    id: number;
    title: string;
    original_title: string;
    overview: string;
    poster: string;
    backdrop: string;
    release_date: string;
    runtime: number | null;
    genres: { id: number; name: string }[];
    vote_average: number;
    vote_count: number;
    production_companies: {
      id: number;
      name: string;
      logo_path: string | null;
      origin_country: string;
    }[];
    cast: {
      id: number;
      name: string;
      character: string;
      profile_image: string;
      department: string;
      order: number;
    }[];
    similar_movies: {
      id: number;
      title: string;
      original_title: string;
      poster_path: string | null;
      backdrop_path: string | null;
      release_date: string;
      vote_average: number;
      vote_count: number;
      overview: string;
    }[];
  } {
    const poster = movie.poster_path ? this.tmdbService.getImageUrl(movie.poster_path, "w500") : "";
    const backdrop = movie.backdrop_path
      ? this.tmdbService.getBackdropUrl(movie.backdrop_path, "w1280")
      : "";

    return {
      id: movie.id,
      title: movie.title,
      original_title: movie.original_title,
      overview: movie.overview,
      poster,
      backdrop,
      release_date: movie.release_date,
      runtime: movie.runtime,
      genres: movie.genres || [],
      vote_average: movie.vote_average,
      vote_count: movie.vote_count,
      production_companies: movie.production_companies || [],
      cast: (movie.credits?.cast || []).map((cast) => this.formatCastMember(cast)),
      similar_movies: (movie.similar?.results || []).map((m) => this.formatMovieForList(m)),
    };
  }
}
