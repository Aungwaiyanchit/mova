export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Movie {
  id: number;
  title: string;
  original_title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
  vote_count: number;
  overview: string;
}

export interface PaginatedMovies {
  data: Movie[];
  meta: PaginationMeta;
}

export interface Genre {
  id: number;
  name: string;
}

export interface CastMember {
  id: number;
  name: string;
  character: string;
  profile_image: string;
  department: string;
  order: number;
}

export interface ProductionCompany {
  id: number;
  name: string;
  logo_path: string | null;
  origin_country: string;
}

export interface MovieDetail {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  poster: string;
  backdrop: string;
  release_date: string;
  runtime: number | null;
  genres: Genre[];
  vote_average: number;
  vote_count: number;
  production_companies: ProductionCompany[];
  cast: CastMember[];
  similar_movies: Movie[];
}

export interface MovieStream {
  id: string;
  title: string;
  quality?: string;
  type?: string;
  url?: string;
  infoHash?: string;
  fileIndex?: number;
  size?: string;
  seeders?: number;
  provider?: string;
  notWebReady?: boolean;
  audioLanguages?: string[];
  filename?: string;
}

export interface StreamsResponse {
  movieId: number;
  streams: MovieStream[];
}

export interface StreamStatus {
  downloadSpeed: number;
}

export interface SubtitleTrack {
  id: string;
  language: string;
  label: string;
}

export interface SubtitlesResponse {
  subtitles: SubtitleTrack[];
}

export interface ApiErrorBody {
  statusCode?: number;
  message?: string | string[];
  error?: string;
}

export type TimeWindow = "day" | "week";

export type MovieSort =
  | "popularity.desc"
  | "primary_release_date.desc"
  | "vote_average.desc"
  | "original_title.asc";
