import type {
  ApiErrorBody,
  Genre,
  MovieDetail,
  MovieSort,
  PaginatedMovies,
  StreamStatus,
  StreamsResponse,
  SubtitlesResponse,
  TimeWindow,
} from "../types/api";

const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:3000/api").replace(/\/$/, "");

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(path: string, params?: Record<string, string | number | undefined>) {
  const url = new URL(`${API_URL}${path}`);

  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined && value !== "") url.searchParams.set(key, String(value));
  }

  const response = await fetch(url, { headers: { Accept: "application/json" } });

  if (!response.ok) {
    let body: ApiErrorBody | undefined;
    try {
      body = (await response.json()) as ApiErrorBody;
    } catch {
      body = undefined;
    }

    const rawMessage = body?.message;
    const message = Array.isArray(rawMessage)
      ? rawMessage.join(". ")
      : rawMessage || `Request failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return (await response.json()) as T;
}

async function requestText(path: string, signal?: AbortSignal) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { Accept: "text/vtt" },
    signal,
  });
  if (!response.ok)
    throw new ApiError(response.status, `Request failed with status ${response.status}`);
  return response.text();
}

export const api = {
  getTrending: (timeWindow: TimeWindow, limit = 12) =>
    request<PaginatedMovies>("/movies/trending", { timeWindow, limit }),
  getPopular: (page = 1, limit = 12) =>
    request<PaginatedMovies>("/movies/popular", { page, limit }),
  getMovies: (options: {
    page: number;
    limit?: number;
    sort?: MovieSort;
    year?: number;
    genre?: number;
  }) => request<PaginatedMovies>("/movies", options),
  searchMovies: (query: string, page = 1, limit = 20) =>
    request<PaginatedMovies>("/movies/search", { q: query, page, limit }),
  getGenres: async () => (await request<{ data: Genre[] }>("/genres")).data,
  getMovie: (id: number) => request<MovieDetail>(`/movies/${id}`),
  getStreams: (id: number) => request<StreamsResponse>(`/movies/${id}/streams`),
  getStreamVideoUrl: (id: number, infoHash: string, fileIndex?: number) => {
    const url = new URL(`${API_URL}/movies/${id}/streams/${infoHash}/video`);
    if (fileIndex !== undefined) url.searchParams.set("fileIndex", String(fileIndex));
    return url.toString();
  },
  getStreamHlsUrl: (id: number, infoHash: string, fileIndex?: number) => {
    const url = new URL(`${API_URL}/movies/${id}/streams/${infoHash}/hls/playlist.m3u8`);
    if (fileIndex !== undefined) url.searchParams.set("fileIndex", String(fileIndex));
    return url.toString();
  },
  getStreamStatus: (id: number, infoHash: string) =>
    request<StreamStatus>(`/movies/${id}/streams/${infoHash}/status`),
  getSubtitles: (id: number) => request<SubtitlesResponse>(`/movies/${id}/subtitles`),
  getSubtitleFile: (id: number, subtitleId: string, signal?: AbortSignal) =>
    requestText(`/movies/${id}/subtitles/${subtitleId}`, signal),
};
