import { NotFoundException } from "@nestjs/common";
import { TorrentioService } from "src/modules/torrentio/torrentio.service";
import { StreamsService } from "./streams.service";

describe("StreamsService", () => {
  const infoHash = "0123456789abcdef0123456789abcdef01234567";
  const torrentioService = {
    getMovieStreams: jest.fn(),
  } as unknown as TorrentioService;
  const service = new StreamsService(torrentioService);

  beforeEach(() => jest.clearAllMocks());

  it("resolves only a torrent source belonging to the movie", async () => {
    jest.spyOn(torrentioService, "getMovieStreams").mockResolvedValue({
      movieId: 123,
      streams: [{ id: "stream-0", title: "Movie", type: "torrent", infoHash, fileIndex: 2 }],
    });

    await expect(service.resolveTorrentSource(123, infoHash, 2)).resolves.toMatchObject({
      infoHash,
      fileIndex: 2,
    });
    await expect(service.resolveTorrentSource(123, infoHash, 1)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
