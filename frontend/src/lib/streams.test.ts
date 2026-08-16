import { describe, expect, it } from "vitest";
import type { MovieStream } from "../types/api";
import { directStreamUrl, groupStreamsByQuality, isHlsStream } from "./streams";

const directStream: MovieStream = {
  id: "720",
  title: "Movie WEB 720p",
  quality: "720P",
  url: "https://media.test/720.mp4",
};
const torrentStream: MovieStream = {
  id: "4k",
  title: "Movie 2160p",
  quality: "2160P",
  infoHash: "abc123",
  fileIndex: 2,
};
const streams: MovieStream[] = [
  directStream,
  torrentStream,
  { id: "1080", title: "Movie 1080p", quality: "1080P", url: "https://media.test/main.m3u8" },
  { id: "unknown", title: "Movie release" },
];

describe("stream helpers", () => {
  it("groups sources into display quality order", () => {
    expect(groupStreamsByQuality(streams).map((group) => group.quality)).toEqual([
      "4K",
      "1080P",
      "720P",
      "Other",
    ]);
  });

  it("only treats HTTP sources as directly playable", () => {
    expect(directStreamUrl(directStream)).toBe("https://media.test/720.mp4");
    expect(directStreamUrl({ id: "unsafe", title: "Unsafe", url: "javascript:alert(1)" })).toBe(
      undefined,
    );
    expect(directStreamUrl(torrentStream)).toBeUndefined();
    expect(
      directStreamUrl({
        id: "torrent-file",
        title: "Torrent file",
        type: "torrent",
        url: "https://media.test/movie.torrent",
      }),
    ).toBeUndefined();
  });

  it("ranks and limits each quality to four sources", () => {
    const ranked = groupStreamsByQuality([
      ...streams,
      { id: "720-2", title: "720p two", quality: "720P", seeders: 20 },
      { id: "720-3", title: "720p three", quality: "720P", seeders: 80 },
      { id: "720-4", title: "720p four", quality: "720P", seeders: 40 },
      { id: "720-5", title: "720p five", quality: "720P", seeders: 10 },
    ]).find((group) => group.quality === "720P");

    expect(ranked?.streams).toHaveLength(4);
    expect(ranked?.streams.map((stream) => stream.seeders)).toEqual([80, 40, 20, 10]);
  });

  it("recognizes HLS manifests", () => {
    expect(isHlsStream("https://media.test/master.m3u8?token=abc")).toBe(true);
    expect(isHlsStream("https://media.test/play?format=hls&token=abc")).toBe(true);
    expect(isHlsStream("https://media.test/play", "hls")).toBe(true);
    expect(isHlsStream("https://media.test/movie.mp4")).toBe(false);
  });
});
