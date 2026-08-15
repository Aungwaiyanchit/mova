import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";

import { ParsePositiveIntPipe } from "src/common/pipes/parse-positive-int.pipe";
import { formatMovieForList } from "src/modules/movies/movie.mapper";
import { GenresMoviesResponseDto, GenresResponseDto, GetGenresMoviesDto } from "./dto/genre.dto";
import { GenresService } from "./genres.service";

@ApiTags("Genres")
@Controller("genres")
export class GenresController {
  constructor(private readonly genresService: GenresService) {}

  @Get()
  @ApiOperation({ summary: "Get all movie genres" })
  @ApiResponse({ status: 200, description: "List of genres", type: GenresResponseDto })
  async getGenres(): Promise<GenresResponseDto> {
    const genres = await this.genresService.getGenres();
    return { data: genres };
  }

  @Get(":genreId/movies")
  @ApiOperation({ summary: "Get movies by genre" })
  @ApiResponse({ status: 200, description: "Movies in the genre", type: GenresMoviesResponseDto })
  @ApiResponse({ status: 404, description: "Genre not found" })
  async getMoviesByGenre(
    @Param("genreId", ParsePositiveIntPipe) genreId: number,
    @Query() query: GetGenresMoviesDto,
  ): Promise<GenresMoviesResponseDto> {
    const result = await this.genresService.getMoviesByGenre(genreId, query.page, query.limit);
    return {
      data: result.data.map(formatMovieForList),
      meta: result.meta,
    };
  }
}
