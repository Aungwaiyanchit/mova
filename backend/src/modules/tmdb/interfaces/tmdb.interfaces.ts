export interface TmdbMovie {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  runtime: number | null;
  vote_average: number;
  vote_count: number;
  genre_ids: number[];
  genres?: TmdbGenre[];
  production_companies?: TmdbProductionCompany[];
  production_countries?: TmdbProductionCountry[];
  spoken_languages?: TmdbSpokenLanguage[];
}

export interface TmdbGenre {
  id: number;
  name: string;
}

export interface TmdbGenresResponse {
  genres: TmdbGenre[];
}

export interface TmdbProductionCompany {
  id: number;
  logo_path: string | null;
  name: string;
  origin_country: string;
}

export interface TmdbProductionCountry {
  iso_3166_1: string;
  name: string;
}

export interface TmdbSpokenLanguage {
  english_name: string;
  iso_639_1: string;
  name: string;
}

export interface TmdbMovieDetails extends TmdbMovie {
  credits?: TmdbCredits;
  similar?: TmdbPaginatedResponse<TmdbMovie>;
  recommendations?: TmdbPaginatedResponse<TmdbMovie>;
  external_ids?: TmdbExternalIds;
}

export interface TmdbCredits {
  cast: TmdbCastMember[];
  crew: TmdbCrewMember[];
}

export interface TmdbCastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
  order: number;
  known_for_department: string;
}

export interface TmdbCrewMember {
  id: number;
  name: string;
  job: string;
  department: string;
  profile_path: string | null;
}

export interface TmdbExternalIds {
  imdb_id?: string | null;
  wikidata_id?: string | null;
  facebook_id?: string | null;
  instagram_id?: string | null;
  twitter_id?: string | null;
}

export interface TmdbPaginatedResponse<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

export interface TmdbSearchParams {
  query: string;
  page?: number;
  language?: string;
  include_adult?: boolean;
  year?: number;
  primary_release_year?: number;
}

export interface TmdbDiscoverParams {
  page?: number;
  sort_by?: string;
  with_genres?: string;
  year?: string;
  language?: string;
  include_adult?: boolean;
  include_video?: boolean;
  vote_count_gte?: number;
  vote_average_gte?: number;
}

export interface TmdbTrendingParams {
  timeWindow: "day" | "week";
  language?: string;
  page?: number;
}
