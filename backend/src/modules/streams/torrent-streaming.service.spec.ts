import { HttpException } from "@nestjs/common";
import WebTorrent = require("webtorrent");
import { TORRENT_TRACKERS } from "./torrent-streaming.constants";
import { parseByteRange, selectVideoFile } from "./torrent-streaming.service";

function torrentFile(name: string, length: number): WebTorrent.TorrentFile {
  return { name, length } as WebTorrent.TorrentFile;
}

describe("torrent streaming helpers", () => {
  it("keeps the configured UDP trackers fixed", () => {
    expect(TORRENT_TRACKERS).toEqual([
      "udp://tracker.opentrackr.org:1337/announce",
      "udp://tracker.openbittorrent.com:6969/announce",
      "udp://exodus.desync.com:6969/announce",
      "udp://tracker.coppersurfer.tk:6969/announce",
      "udp://open.stealth.si:80/announce",
      "udp://tracker.torrent.eu.org:451/announce",
    ]);
  });

  it("parses full, open, and suffix byte ranges", () => {
    expect(parseByteRange(undefined, 1_000)).toEqual({ start: 0, end: 999, statusCode: 200 });
    expect(parseByteRange("bytes=100-199", 1_000)).toEqual({
      start: 100,
      end: 199,
      statusCode: 206,
    });
    expect(parseByteRange("bytes=900-", 1_000)).toEqual({
      start: 900,
      end: 999,
      statusCode: 206,
    });
    expect(parseByteRange("bytes=-100", 1_000)).toEqual({
      start: 900,
      end: 999,
      statusCode: 206,
    });
  });

  it("rejects invalid byte ranges", () => {
    expect(() => parseByteRange("bytes=1000-", 1_000)).toThrow(HttpException);
    expect(() => parseByteRange("bytes=200-100", 1_000)).toThrow(HttpException);
    expect(() => parseByteRange("bytes=0-10,20-30", 1_000)).toThrow(HttpException);
  });

  it("uses the requested video or falls back to the largest video file", () => {
    const files = [
      torrentFile("readme.txt", 10),
      torrentFile("sample.mp4", 100),
      torrentFile("movie.mkv", 1_000),
    ];

    expect(selectVideoFile(files, 1)?.name).toBe("sample.mp4");
    expect(selectVideoFile(files, 0)?.name).toBe("movie.mkv");
  });
});
