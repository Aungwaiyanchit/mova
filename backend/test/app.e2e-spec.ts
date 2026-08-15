import { INestApplication, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import * as request from "supertest";

import { AppModule } from "../src/app.module";
import { configureApp, configureSwagger } from "../src/configure-app";
import { TmdbMovie, TmdbMovieDetails } from "../src/modules/tmdb/interfaces/tmdb.interfaces";
import { TmdbService } from "../src/modules/tmdb/tmdb.service";
import { TorrentioService } from "../src/modules/torrentio/torrentio.service";

describe("API routes (e2e)", () => {
  let app: INestApplication;

  const movie: TmdbMovie = {
    id: 123,
    title: "Test Movie",
    original_title: "Test Movie",
    overview: "Test overview",
    poster_path: "/poster.jpg",
    backdrop_path: "/backdrop.jpg",
    release_date: "2024-01-01",
    runtime: 120,
    vote_average: 8.5,
    vote_count: 100,
    genre_ids: [28],
  };
  const page = {
    page: 1,
    results: [movie],
    total_pages: 1,
    total_results: 1,
  };
  const details: TmdbMovieDetails = {
    ...movie,
    genres: [{ id: 28, name: "Action" }],
    production_companies: [],
    credits: { cast: [], crew: [] },
    similar: page,
  };

  beforeAll(async () => {
    const tmdbService = {
      getGenres: jest.fn().mockResolvedValue([{ id: 28, name: "Action" }]),
      discoverMovies: jest.fn().mockResolvedValue(page),
      getPopularMovies: jest.fn().mockResolvedValue(page),
      searchMovies: jest.fn().mockResolvedValue(page),
      getTrendingMovies: jest.fn().mockResolvedValue(page),
      getMovieDetails: jest.fn().mockImplementation((id: number) => {
        if (id === 999999) {
          throw new NotFoundException("Movie resource not found");
        }
        return Promise.resolve(details);
      }),
      getMovieCredits: jest.fn().mockResolvedValue({ cast: [], crew: [] }),
      getImageUrl: jest.fn().mockReturnValue("https://image.test/poster.jpg"),
      getBackdropUrl: jest.fn().mockReturnValue("https://image.test/backdrop.jpg"),
      getProfileUrl: jest.fn().mockReturnValue("https://image.test/profile.jpg"),
    };
    const torrentioService = {
      getMovieStreams: jest.fn().mockResolvedValue({ movieId: 123, streams: [] }),
    };
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(TmdbService)
      .useValue(tmdbService)
      .overrideProvider(TorrentioService)
      .useValue(torrentioService)
      .compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    configureSwagger(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("registers movie routes under one global prefix", async () => {
    await request(app.getHttpServer()).get("/api/movies").expect(200);
    await request(app.getHttpServer()).get("/api/api/movies").expect(404);
  });

  it("routes the static trending path before the movie ID path", async () => {
    const response = await request(app.getHttpServer()).get("/api/movies/trending").expect(200);

    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0]).toEqual(expect.objectContaining({ id: 123 }));
  });

  it("returns consistent wrappers for collections", async () => {
    const paths = [
      "/api/movies",
      "/api/movies/search?q=test",
      "/api/movies/popular",
      "/api/genres",
      "/api/genres/28/movies",
    ];

    for (const path of paths) {
      const response = await request(app.getHttpServer()).get(path).expect(200);
      expect(Array.isArray(response.body.data)).toBe(true);
    }
  });

  it("rejects malformed IDs and query parameters", async () => {
    await request(app.getHttpServer()).get("/api/movies/123abc").expect(400);
    await request(app.getHttpServer()).get("/api/movies/-1").expect(400);
    await request(app.getHttpServer()).get("/api/movies?page=1.5").expect(400);
    await request(app.getHttpServer()).get("/api/movies?limit=101").expect(400);
    await request(app.getHttpServer()).get("/api/movies?page=101&limit=100").expect(400);
    await request(app.getHttpServer()).get("/api/movies/search?q=%20%20").expect(400);
    await request(app.getHttpServer()).get("/api/movies?sort=invalid").expect(400);
  });

  it("preserves provider not-found responses", async () => {
    const response = await request(app.getHttpServer()).get("/api/movies/999999").expect(404);

    expect(response.body.path).toBe("/api/movies/999999");
  });

  it("serves streams and Swagger from documented paths", async () => {
    await request(app.getHttpServer()).get("/api/movies/123/streams").expect(200);
    await request(app.getHttpServer()).get("/api/docs").expect(200);
    await request(app.getHttpServer()).get("/docs").expect(404);
  });

  it("publishes scalar OpenAPI schemas", async () => {
    const response = await request(app.getHttpServer()).get("/api/docs-json").expect(200);
    const schemas = response.body.components.schemas;

    expect(schemas.PaginationMetaDto.properties.page.type).toBe("number");
    expect(schemas.MovieResponseDto.properties.poster_path).toEqual(
      expect.objectContaining({ type: "string", nullable: true }),
    );
    expect(schemas.MovieDetailResponseDto.properties.runtime).toEqual(
      expect.objectContaining({ type: "number", nullable: true }),
    );
  });
});
