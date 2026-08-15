import { HttpModule, HttpService } from "@nestjs/axios";
import { NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import { AxiosResponse } from "axios";
import { of, throwError } from "rxjs";
import { CommonModule } from "src/common/common.module";

import {
  TmdbExternalIds,
  TmdbGenre,
  TmdbMovie,
  TmdbPaginatedResponse,
} from "./interfaces/tmdb.interfaces";
import { TmdbClient } from "./tmdb.client";
import { TmdbService } from "./tmdb.service";

const _mockHttpService = {
  get: jest.fn(),
};

const _mockCacheService = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  getOrSet: jest.fn(),
};

describe("TmdbClient", () => {
  let client: TmdbClient;
  const get = jest.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), HttpModule],
      providers: [
        TmdbClient,
        {
          provide: HttpService,
          useValue: { get },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === "tmdb.baseUrl") return "https://api.example.test";
              if (key === "tmdb.apiKey") return "test-key";
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    client = module.get<TmdbClient>(TmdbClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(client).toBeDefined();
  });

  it("reads the TMDB genre response and sends the configured API key", async () => {
    get.mockReturnValue(of({ data: { genres: [{ id: 28, name: "Action" }] } } as AxiosResponse));

    await expect(client.getGenres()).resolves.toEqual([{ id: 28, name: "Action" }]);
    expect(get).toHaveBeenCalledWith(
      "https://api.example.test/genre/movie/list",
      expect.objectContaining({
        params: expect.objectContaining({ api_key: "test-key" }),
      }),
    );
  });

  it("recognizes a v4 token stored in the legacy API key variable", async () => {
    const bearerGet = jest
      .fn()
      .mockReturnValue(of({ data: { genres: [{ id: 28, name: "Action" }] } } as AxiosResponse));
    const bearerClient = new TmdbClient(
      { get: bearerGet } as unknown as HttpService,
      {
        get: (key: string) => {
          if (key === "tmdb.baseUrl") return "https://api.example.test";
          if (key === "tmdb.apiKey") return "eyJ.test-token";
          return undefined;
        },
      } as ConfigService,
    );

    await bearerClient.getGenres();

    expect(bearerGet).toHaveBeenCalledWith(
      "https://api.example.test/genre/movie/list",
      expect.objectContaining({
        headers: { Authorization: "Bearer eyJ.test-token" },
        params: expect.not.objectContaining({ api_key: expect.anything() }),
      }),
    );
  });

  it("translates provider not-found responses", async () => {
    get.mockReturnValue(
      throwError(() => ({
        isAxiosError: true,
        message: "Not found",
        response: { status: 404, data: { status_message: "Not found" } },
      })),
    );

    await expect(client.getMovieDetails(999)).rejects.toBeInstanceOf(NotFoundException);
  });

  it("translates provider rate limits to service unavailable", async () => {
    get.mockReturnValue(
      throwError(() => ({
        isAxiosError: true,
        message: "Rate limited",
        response: { status: 429, data: { status_message: "Rate limited" } },
      })),
    );

    await expect(client.getPopularMovies()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});

describe("TmdbService", () => {
  let service: TmdbService;
  let tmdbClient: jest.Mocked<TmdbClient>;

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

  const mockPaginatedResponse: TmdbPaginatedResponse<TmdbMovie> = {
    page: 1,
    results: [mockMovie],
    total_pages: 1,
    total_results: 1,
  };

  beforeEach(async () => {
    const mockClient = {
      getGenres: jest.fn(),
      getPopularMovies: jest.fn(),
      getTrendingMovies: jest.fn(),
      searchMovies: jest.fn(),
      discoverMovies: jest.fn(),
      getMovieDetails: jest.fn(),
      getMovieCredits: jest.fn(),
      getSimilarMovies: jest.fn(),
      getMovieExternalIds: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [CommonModule],
      providers: [
        TmdbService,
        {
          provide: TmdbClient,
          useValue: mockClient,
        },
      ],
    }).compile();

    service = module.get<TmdbService>(TmdbService);
    tmdbClient = module.get(TmdbClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("getGenres", () => {
    it("should return genres from client", async () => {
      const mockGenres: TmdbGenre[] = [
        { id: 28, name: "Action" },
        { id: 12, name: "Adventure" },
      ];
      tmdbClient.getGenres.mockResolvedValue(mockGenres);

      const result = await service.getGenres();
      expect(result).toEqual(mockGenres);
      expect(tmdbClient.getGenres).toHaveBeenCalled();
    });
  });

  describe("getPopularMovies", () => {
    it("should return popular movies", async () => {
      tmdbClient.getPopularMovies.mockResolvedValue(mockPaginatedResponse);

      const result = await service.getPopularMovies({ page: 1 });
      expect(result).toEqual(mockPaginatedResponse);
      expect(tmdbClient.getPopularMovies).toHaveBeenCalledWith({ page: 1 });
    });
  });

  describe("searchMovies", () => {
    it("should return search results", async () => {
      tmdbClient.searchMovies.mockResolvedValue(mockPaginatedResponse);

      const result = await service.searchMovies({ query: "test", page: 1 });
      expect(result).toEqual(mockPaginatedResponse);
      expect(tmdbClient.searchMovies).toHaveBeenCalledWith({ query: "test", page: 1 });
    });
  });

  describe("getMovieDetails", () => {
    it("should return movie details", async () => {
      const mockDetails = {
        ...mockMovie,
        genres: [{ id: 28, name: "Action" }],
        credits: { cast: [], crew: [] },
        similar: mockPaginatedResponse,
        external_ids: { imdb_id: "tt1234567" },
      };
      tmdbClient.getMovieDetails.mockResolvedValue(mockDetails);

      const result = await service.getMovieDetails(123);
      expect(result).toEqual(mockDetails);
      expect(tmdbClient.getMovieDetails).toHaveBeenCalledWith(123, "credits,similar");
    });
  });

  describe("getMovieExternalIds", () => {
    it("should return external IDs", async () => {
      const mockExternalIds: TmdbExternalIds = { imdb_id: "tt1234567" };
      tmdbClient.getMovieExternalIds.mockResolvedValue(mockExternalIds);

      const result = await service.getMovieExternalIds(123);
      expect(result).toEqual(mockExternalIds);
      expect(tmdbClient.getMovieExternalIds).toHaveBeenCalledWith(123);
    });
  });

  describe("image URL helpers", () => {
    it("should generate correct poster URL", () => {
      const url = service.getImageUrl("/poster.jpg", "w500");
      expect(url).toBe("https://image.tmdb.org/t/p/w500/poster.jpg");
    });

    it("should return empty string for null path", () => {
      const url = service.getImageUrl(null, "w500");
      expect(url).toBe("");
    });

    it("should generate correct backdrop URL", () => {
      const url = service.getBackdropUrl("/backdrop.jpg", "w1280");
      expect(url).toBe("https://image.tmdb.org/t/p/w1280/backdrop.jpg");
    });

    it("should generate correct profile URL", () => {
      const url = service.getProfileUrl("/profile.jpg", "w185");
      expect(url).toBe("https://image.tmdb.org/t/p/w185/profile.jpg");
    });
  });
});
