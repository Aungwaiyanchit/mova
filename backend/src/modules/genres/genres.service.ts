import { Injectable, NotFoundException } from "@nestjs/common";

import { TmdbGenre, TmdbMovie } from "src/modules/tmdb/interfaces/tmdb.interfaces";
import { PaginatedResult, paginateTmdb } from "src/modules/tmdb/tmdb-pagination";
import { TmdbService } from "src/modules/tmdb/tmdb.service";

@Injectable()
export class GenresService {
  constructor(private readonly tmdbService: TmdbService) {}

  async getGenres(): Promise<TmdbGenre[]> {
    return this.tmdbService.getGenres();
  }

  async getMoviesByGenre(
    genreId: number,
    page = 1,
    limit = 20,
  ): Promise<PaginatedResult<TmdbMovie>> {
    const genres = await this.tmdbService.getGenres();
    const genre = genres.find((g) => g.id === genreId);

    if (!genre) {
      throw new NotFoundException(`Genre with ID ${genreId} not found`);
    }

    return paginateTmdb(
      (providerPage) =>
        this.tmdbService.discoverMovies({
          with_genres: String(genreId),
          page: providerPage,
          sort_by: "popularity.desc",
        }),
      page,
      limit,
    );
  }
}
