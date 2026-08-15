import { TmdbMovie } from "src/modules/tmdb/interfaces/tmdb.interfaces";

import { MovieResponseDto } from "./dto/movie.dto";

export function formatMovieForList(movie: TmdbMovie): MovieResponseDto {
  return {
    id: movie.id,
    title: movie.title,
    original_title: movie.original_title,
    poster_path: movie.poster_path,
    backdrop_path: movie.backdrop_path,
    release_date: movie.release_date,
    vote_average: movie.vote_average,
    vote_count: movie.vote_count,
    overview: movie.overview,
  };
}
