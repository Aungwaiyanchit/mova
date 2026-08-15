import { CacheModule } from "@nestjs/cache-manager";
import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";

import { TmdbMovie, TmdbMovieDetails } from "../tmdb/interfaces/tmdb.interfaces";
import { TmdbService } from "../tmdb/tmdb.service";
import { MoviesService } from "./movies.service";

const mockCacheService = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  getOrSet: jest.fn(),
};

describe("MoviesService", () => {
  let service: MoviesService;
  let tmdbService: jest.Mocked<TmdbService>;

  const mockMovie: TmdbMovie = {
    id: 123,
    title: "Test Movie",
    original_title: "Test Movie",
    overview: "Test overview",
    poster_path: "/poster.jpg",
    backdrop_path: "/backdrop.jpg",
    release_date: "2024-01-01",
    runtime: 120,
    vote_average: 8.5,
    vote_count: 1000,
    genre_ids: [28, 12],
  };

  const mockPaginatedResponse = {
    page: 1,
    results: [mockMovie],
    total_pages: 1,
    total_results: 1,
  };

  const mockMovieDetails: TmdbMovieDetails = {
    ...mockMovie,
    genres: [{ id: 28, name: "Action" }],
    credits: {
      cast: [
        {
          id: 1,
          name: "Actor 1",
          character: "Character 1",
          profile_path: "/actor.jpg",
          order: 0,
          known_for_department: "Acting",
        },
      ],
      crew: [],
    },
    similar: mockPaginatedResponse,
    external_ids: { imdb_id: "tt1234567" },
    production_companies: [{ id: 1, name: "Studio", logo_path: null, origin_country: "US" }],
  };

  beforeEach(async () => {
    const mockTmdb = {
      discoverMovies: jest.fn(),
      searchMovies: jest.fn(),
      getMovieDetails: jest.fn(),
      getMovieCredits: jest.fn(),
      getImageUrl: jest.fn().mockImplementation((path) => `https://image.tmdb.org/t/p/w500${path}`),
      getBackdropUrl: jest
        .fn()
        .mockImplementation((path) => `https://image.tmdb.org/t/p/w1280${path}`),
      getProfileUrl: jest
        .fn()
        .mockImplementation((path) => `https://image.tmdb.org/t/p/w185${path}`),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [CacheModule.register()],
      providers: [
        MoviesService,
        {
          provide: TmdbService,
          useValue: mockTmdb,
        },
        {
          provide: "CacheService",
          useValue: mockCacheService,
        },
      ],
    }).compile();

    service = module.get<MoviesService>(MoviesService);
    tmdbService = module.get(TmdbService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("getMovies", () => {
    it("should return paginated movies", async () => {
      tmdbService.discoverMovies.mockResolvedValue(mockPaginatedResponse);

      const result = await service.getMovies(1, 20, "popularity.desc", 2024, 28);

      expect(result.data).toHaveLength(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(20);
      expect(result.meta.total).toBe(1);
      expect(tmdbService.discoverMovies).toHaveBeenCalledWith({
        page: 1,
        sort_by: "popularity.desc",
        year: "2024",
        with_genres: "28",
      });
    });
  });

  describe("searchMovies", () => {
    it("should return search results", async () => {
      tmdbService.searchMovies.mockResolvedValue(mockPaginatedResponse);

      const result = await service.searchMovies("test", 1, 20);

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(tmdbService.searchMovies).toHaveBeenCalledWith({
        query: "test",
        page: 1,
        language: "en-US",
        include_adult: false,
      });
    });
  });

  describe("getMovieDetails", () => {
    it("should return movie details independently of stream providers", async () => {
      tmdbService.getMovieDetails.mockResolvedValue(mockMovieDetails);

      const result = await service.getMovieDetails(123);

      expect(result).toEqual(mockMovieDetails);
      expect(tmdbService.getMovieDetails).toHaveBeenCalledWith(123);
    });

    it("should throw NotFoundException when movie not found", async () => {
      tmdbService.getMovieDetails.mockRejectedValue(new NotFoundException("Movie not found"));

      await expect(service.getMovieDetails(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe("pagination", () => {
    it("translates a smaller second API page to the correct TMDB offset", async () => {
      const providerMovies = Array.from({ length: 20 }, (_, index) => ({
        ...mockMovie,
        id: index + 1,
      }));
      tmdbService.searchMovies.mockResolvedValue({
        page: 1,
        results: providerMovies,
        total_pages: 2,
        total_results: 40,
      });

      const result = await service.searchMovies("test", 2, 10);

      expect(result.data.map((movie) => movie.id)).toEqual([
        11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
      ]);
      expect(result.meta).toEqual({ page: 2, limit: 10, total: 40, totalPages: 4 });
      expect(tmdbService.searchMovies).toHaveBeenCalledWith(expect.objectContaining({ page: 1 }));
    });
  });

  describe("getMovieCast", () => {
    it("should return movie cast", async () => {
      const mockCredits = {
        cast: [
          {
            id: 1,
            name: "Actor 1",
            character: "Character 1",
            profile_path: "/actor.jpg",
            order: 0,
            known_for_department: "Acting",
          },
        ],
        crew: [],
      };
      tmdbService.getMovieCredits.mockResolvedValue(mockCredits);

      const result = await service.getMovieCast(123);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Actor 1");
      expect(tmdbService.getMovieCredits).toHaveBeenCalledWith(123);
    });
  });

  describe("formatMovieForList", () => {
    it("should format movie for list view", () => {
      const result = service.formatMovieForList(mockMovie);

      expect(result).toEqual({
        id: 123,
        title: "Test Movie",
        original_title: "Test Movie",
        poster_path: "/poster.jpg",
        backdrop_path: "/backdrop.jpg",
        release_date: "2024-01-01",
        vote_average: 8.5,
        vote_count: 1000,
        overview: "Test overview",
      });
    });
  });

  describe("formatMovieForDetail", () => {
    it("should format movie for detail view with all relations", () => {
      const result = service.formatMovieForDetail(mockMovieDetails);

      expect(result.id).toBe(123);
      expect(result.title).toBe("Test Movie");
      expect(result.poster).toBe("https://image.tmdb.org/t/p/w500/poster.jpg");
      expect(result.backdrop).toBe("https://image.tmdb.org/t/p/w1280/backdrop.jpg");
      expect(result.genres).toEqual([{ id: 28, name: "Action" }]);
      expect(result.cast).toHaveLength(1);
      expect(result.cast[0].name).toBe("Actor 1");
      expect(result.similar_movies).toHaveLength(1);
    });
  });
});
