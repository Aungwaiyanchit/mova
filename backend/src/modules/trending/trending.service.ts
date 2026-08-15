import { Injectable } from "@nestjs/common";

import { TmdbMovie } from "src/modules/tmdb/interfaces/tmdb.interfaces";
import { PaginatedResult, paginateTmdb } from "src/modules/tmdb/tmdb-pagination";
import { TmdbService } from "src/modules/tmdb/tmdb.service";
import { TimeWindow } from "./dto/trending.dto";

@Injectable()
export class TrendingService {
  constructor(private readonly tmdbService: TmdbService) {}

  async getTrendingMovies(
    timeWindow: TimeWindow,
    page = 1,
    limit = 20,
  ): Promise<PaginatedResult<TmdbMovie>> {
    return paginateTmdb(
      (providerPage) =>
        this.tmdbService.getTrendingMovies({
          timeWindow,
          language: "en-US",
          page: providerPage,
        }),
      page,
      limit,
    );
  }
}
