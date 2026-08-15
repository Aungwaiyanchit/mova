import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from "@nestjs/swagger";

import { PaginationDto } from "src/common/dto/pagination.dto";
import { ParsePositiveIntPipe } from "src/common/pipes/parse-positive-int.pipe";
import { GetTrendingDto, TrendingResponseDto } from "src/modules/trending/dto/trending.dto";
import { TrendingService } from "src/modules/trending/trending.service";
import {
  CastResponseDto,
  GetMoviesDto,
  MovieDetailResponseDto,
  MoviesResponseDto,
  SearchMoviesDto,
} from "./dto/movie.dto";
import { MoviesService } from "./movies.service";

@ApiTags("Movies")
@Controller("movies")
export class MoviesController {
  constructor(
    private readonly moviesService: MoviesService,
    private readonly trendingService: TrendingService,
  ) {}

  @Get()
  @ApiOperation({ summary: "Browse movies with filters" })
  @ApiQuery({ name: "page", required: false, example: 1 })
  @ApiQuery({ name: "limit", required: false, example: 20 })
  @ApiQuery({ name: "sort", required: false, example: "popularity.desc" })
  @ApiQuery({ name: "year", required: false, example: 2024 })
  @ApiQuery({ name: "genre", required: false, example: 28 })
  @ApiResponse({ status: 200, description: "List of movies", type: MoviesResponseDto })
  async getMovies(@Query() query: GetMoviesDto): Promise<MoviesResponseDto> {
    const { page, limit } = query;
    const sort = query.sort;
    const year = query.year;
    const genre = query.genre;

    const result = await this.moviesService.getMovies(page, limit, sort, year, genre);

    return {
      data: result.data.map((movie) => this.moviesService.formatMovieForList(movie)),
      meta: result.meta,
    };
  }

  @Get("search")
  @ApiOperation({ summary: "Search movies" })
  @ApiQuery({ name: "q", required: true, example: "oppenheimer" })
  @ApiQuery({ name: "page", required: false, example: 1 })
  @ApiQuery({ name: "limit", required: false, example: 20 })
  @ApiResponse({ status: 200, description: "Search results", type: MoviesResponseDto })
  async searchMovies(@Query() query: SearchMoviesDto): Promise<MoviesResponseDto> {
    const { page, limit } = query;

    const result = await this.moviesService.searchMovies(query.q, page, limit);
    console.log(result);

    return {
      data: result.data.map((movie) => this.moviesService.formatMovieForList(movie)),
      meta: result.meta,
    };
  }

  @Get("popular")
  @ApiOperation({ summary: "Get popular movies" })
  @ApiQuery({ name: "page", required: false, example: 1 })
  @ApiQuery({ name: "limit", required: false, example: 20 })
  @ApiResponse({ status: 200, description: "Popular movies", type: MoviesResponseDto })
  async getPopularMovies(@Query() query: PaginationDto): Promise<MoviesResponseDto> {
    const result = await this.moviesService.getPopularMovies(query.page, query.limit);

    return {
      data: result.data.map((movie) => this.moviesService.formatMovieForList(movie)),
      meta: result.meta,
    };
  }

  @Get("trending")
  @ApiOperation({ summary: "Get trending movies" })
  @ApiResponse({ status: 200, description: "Trending movies", type: TrendingResponseDto })
  async getTrending(@Query() query: GetTrendingDto): Promise<TrendingResponseDto> {
    const result = await this.trendingService.getTrendingMovies(
      query.timeWindow,
      query.page,
      query.limit,
    );

    return {
      data: result.data.map((movie) => this.moviesService.formatMovieForList(movie)),
      meta: result.meta,
    };
  }

  @Get(":id")
  @ApiOperation({ summary: "Get movie details" })
  @ApiParam({ name: "id", description: "TMDB Movie ID", example: "123" })
  @ApiResponse({ status: 200, description: "Movie details", type: MovieDetailResponseDto })
  @ApiResponse({ status: 404, description: "Movie not found" })
  async getMovie(
    @Param("id", ParsePositiveIntPipe) movieId: number,
  ): Promise<MovieDetailResponseDto> {
    const movie = await this.moviesService.getMovieDetails(movieId);

    return this.moviesService.formatMovieForDetail(movie);
  }

  @Get(":id/cast")
  @ApiOperation({ summary: "Get movie cast" })
  @ApiParam({ name: "id", description: "TMDB Movie ID", example: "123" })
  @ApiResponse({ status: 200, description: "Movie cast", type: CastResponseDto })
  @ApiResponse({ status: 404, description: "Movie not found" })
  async getMovieCast(@Param("id", ParsePositiveIntPipe) movieId: number): Promise<CastResponseDto> {
    const cast = await this.moviesService.getMovieCast(movieId);

    return {
      data: cast.map((member) => this.moviesService.formatCastMember(member)),
    };
  }
}
