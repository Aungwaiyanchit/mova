export interface TorrentioStream {
  name: string;
  title: string;
  behaviorHints?: {
    bingeGroup?: string;
    filename?: string;
    notWebReady?: boolean;
    videoSize?: number;
  };
  url?: string;
  infoHash?: string;
  fileIdx?: number;
}

export interface TorrentioResponse {
  streams: TorrentioStream[];
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
}

export interface NormalizedStreamsResponse {
  movieId: number;
  streams: MovieStream[];
}

export interface TorrentioStreamParams {
  type: "movie" | "series";
  id: string; // IMDB ID or TMDB ID
  season?: number;
  episode?: number;
}
