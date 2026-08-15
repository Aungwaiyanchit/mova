import { Test, TestingModule } from "@nestjs/testing";
import { CommonModule } from "src/common/common.module";

import { TmdbService } from "../tmdb/tmdb.service";
import { TorrentioClient } from "./torrentio.client";
import { TorrentioService } from "./torrentio.service";

const _mockCacheService = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  getOrSet: jest.fn(),
};

describe("TorrentioService", () => {
  let service: TorrentioService;
  let torrentioClient: jest.Mocked<TorrentioClient>;
  let tmdbService: jest.Mocked<TmdbService>;

  const mockExternalIds = { imdb_id: "tt1234567" };
  const mockTorrentioStreams = [
    {
      name: "Movie 1080p 👤 150",
      title: "Movie 1080p",
      behaviorHints: { videoSize: 2684354560 },
      url: "magnet:?xt=urn:btih:0123456789abcdef0123456789abcdef01234567&fileIndex=0",
    },
    {
      name: "Movie 720p 👤 50",
      title: "Movie 720p",
      behaviorHints: { videoSize: 1073741824 },
      url: "magnet:?xt=urn:btih:89abcdef0123456789abcdef0123456789abcdef&fileIndex=0",
    },
  ];

  beforeEach(async () => {
    const mockClient = {
      getStreams: jest.fn(),
    };

    const mockTmdbService = {
      getMovieExternalIds: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [CommonModule],
      providers: [
        TorrentioService,
        {
          provide: TorrentioClient,
          useValue: mockClient,
        },
        {
          provide: TmdbService,
          useValue: mockTmdbService,
        },
      ],
    }).compile();

    service = module.get<TorrentioService>(TorrentioService);
    torrentioClient = module.get(TorrentioClient);
    tmdbService = module.get(TmdbService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("getMovieStreams", () => {
    it("should return normalized streams when IMDB ID exists", async () => {
      tmdbService.getMovieExternalIds.mockResolvedValue(mockExternalIds);
      torrentioClient.getStreams.mockResolvedValue({ streams: mockTorrentioStreams });

      const result = await service.getMovieStreams(123);

      expect(result).toBeDefined();
      expect(result.movieId).toBe(123);
      expect(result.streams).toHaveLength(2);
      expect(result.streams[0]).toMatchObject({
        id: "stream-0",
        title: "Movie 1080p",
        quality: "1080P",
        type: "torrent",
        infoHash: "0123456789abcdef0123456789abcdef01234567",
        fileIndex: 0,
        size: "2.50 GB",
        seeders: 150,
      });
      expect(tmdbService.getMovieExternalIds).toHaveBeenCalledWith(123);
      expect(torrentioClient.getStreams).toHaveBeenCalledWith({
        type: "movie",
        id: "tt1234567",
      });
    });

    it("should return empty streams when no IMDB ID", async () => {
      tmdbService.getMovieExternalIds.mockResolvedValue({ imdb_id: null });
      torrentioClient.getStreams.mockResolvedValue({ streams: [] });

      const result = await service.getMovieStreams(123);

      expect(result).toEqual({ movieId: 123, streams: [] });
      expect(torrentioClient.getStreams).not.toHaveBeenCalled();
    });

    it("should propagate Torrentio outages without caching an empty result", async () => {
      tmdbService.getMovieExternalIds.mockResolvedValue(mockExternalIds);
      torrentioClient.getStreams.mockRejectedValue(new Error("No streams found"));

      await expect(service.getMovieStreams(123)).rejects.toThrow("No streams found");
    });

    it("should propagate provider transport-level not-found responses", async () => {
      tmdbService.getMovieExternalIds.mockResolvedValue(mockExternalIds);
      torrentioClient.getStreams.mockRejectedValue(new Error("Provider endpoint was not found"));

      await expect(service.getMovieStreams(123)).rejects.toThrow("Provider endpoint was not found");
    });

    it("should normalize direct Torrentio torrent fields", async () => {
      tmdbService.getMovieExternalIds.mockResolvedValue(mockExternalIds);
      torrentioClient.getStreams.mockResolvedValue({
        streams: [
          {
            name: "Movie 1080p",
            title: "Movie 1080p",
            infoHash: "ABC123",
            fileIdx: 2,
          },
        ],
      });

      const result = await service.getMovieStreams(123);

      expect(result.streams[0]).toEqual(
        expect.objectContaining({ type: "torrent", infoHash: "abc123", fileIndex: 2 }),
      );
    });

    it("should normalize quality correctly", async () => {
      const streamsWithQuality = [
        { name: "Movie 4K", title: "Movie 4K", behaviorHints: {}, url: "magnet:?xt=urn:btih:abc" },
        {
          name: "Movie 2160p",
          title: "Movie 2160p",
          behaviorHints: {},
          url: "magnet:?xt=urn:btih:def",
        },
        {
          name: "Movie 720p",
          title: "Movie 720p",
          behaviorHints: {},
          url: "magnet:?xt=urn:btih:ghi",
        },
      ];
      tmdbService.getMovieExternalIds.mockResolvedValue(mockExternalIds);
      torrentioClient.getStreams.mockResolvedValue({ streams: streamsWithQuality });

      const result = await service.getMovieStreams(123);

      expect(result.streams[0].quality).toBe("4K");
      expect(result.streams[1].quality).toBe("2160P");
      expect(result.streams[2].quality).toBe("720P");
    });

    it("should extract seeders from name", async () => {
      const streamsWithSeeders = [
        { name: "Movie 👤 200", title: "Movie", behaviorHints: {}, url: "magnet:?xt=urn:btih:abc" },
        {
          name: "Movie 100 seeders",
          title: "Movie",
          behaviorHints: {},
          url: "magnet:?xt=urn:btih:def",
        },
      ];
      tmdbService.getMovieExternalIds.mockResolvedValue(mockExternalIds);
      torrentioClient.getStreams.mockResolvedValue({ streams: streamsWithSeeders });

      const result = await service.getMovieStreams(123);

      expect(result.streams[0].seeders).toBe(200);
      expect(result.streams[1].seeders).toBe(100);
    });
  });

  describe("formatSize", () => {
    // This is a private method, tested through public API
    it("should format sizes correctly via getMovieStreams", async () => {
      const streamsWithSizes = [
        {
          name: "Movie",
          title: "Movie",
          behaviorHints: { videoSize: 1073741824 },
          url: "magnet:?xt=urn:btih:abc",
        },
        {
          name: "Movie",
          title: "Movie",
          behaviorHints: { videoSize: 1048576 },
          url: "magnet:?xt=urn:btih:def",
        },
      ];
      tmdbService.getMovieExternalIds.mockResolvedValue(mockExternalIds);
      torrentioClient.getStreams.mockResolvedValue({ streams: streamsWithSizes });

      const result = await service.getMovieStreams(123);

      expect(result.streams[0].size).toBe("1.00 GB");
      expect(result.streams[1].size).toBe("1.00 MB");
    });
  });
});
