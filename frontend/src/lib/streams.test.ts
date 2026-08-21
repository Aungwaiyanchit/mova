import { describe, expect, it } from "vitest";
import type { MovieStream } from "../types/api";
import {
  directStreamUrl,
  groupStreamsByQuality,
  hasEnglishAudio,
  isBrowserReadyRelease,
  isHlsStream,
  streamTechnicalTags,
} from "./streams";

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

  it("keeps only sources that can provide English audio", () => {
    expect(hasEnglishAudio({ id: "default", title: "Movie 2026 1080p WEB-DL" })).toBe(true);
    expect(hasEnglishAudio({ id: "multi", title: "Movie.2026.MULTI.ENG.FRENCH.1080p" })).toBe(true);
    expect(hasEnglishAudio({ id: "ambiguous", title: "Movie.2026.MULTI.1080p" })).toBe(false);
    expect(hasEnglishAudio({ id: "french", title: "Movie.2026.French.1080p" })).toBe(false);
    expect(
      hasEnglishAudio({ id: "flags", title: "Movie 2026 1080p", audioLanguages: ["en", "it"] }),
    ).toBe(true);
    expect(
      hasEnglishAudio({ id: "foreign-flags", title: "Movie 2026 1080p", audioLanguages: ["hi"] }),
    ).toBe(false);
    expect(hasEnglishAudio({ id: "foreign", title: "Movie 1080p", provider: "Rutracker" })).toBe(
      false,
    );
    expect(
      hasEnglishAudio({
        id: "foreign-english",
        title: "Movie.2026.ENG.1080p",
        provider: "Rutracker",
      }),
    ).toBe(true);
    expect(hasEnglishAudio({ id: "title", title: "The French Dispatch 2021 1080p" })).toBe(true);
  });

  it("allows direct playback only for browser-decodable releases", () => {
    expect(
      isBrowserReadyRelease({
        id: "mp4-aac",
        title: "Movie 2026 1080p x264",
        filename: "Movie.2026.1080p.x264.AAC.mp4",
      }),
    ).toBe(true);
    expect(
      isBrowserReadyRelease({
        id: "mp4-ac3",
        title: "Movie 2026 1080p",
        filename: "Movie.2026.1080p.DD5.1.mp4",
      }),
    ).toBe(false);
    expect(
      isBrowserReadyRelease({
        id: "mkv-aac",
        title: "Movie 2026 1080p",
        filename: "Movie.2026.1080p.AAC5.1.mkv",
      }),
    ).toBe(true);
    expect(
      isBrowserReadyRelease({
        id: "mkv-dts",
        title: "Movie 2026 1080p DTS",
        filename: "Movie.2026.1080p.DTS-HD.MA.5.1.mkv",
      }),
    ).toBe(false);
    expect(
      isBrowserReadyRelease({ id: "mkv-unknown", title: "Movie 2026", filename: "movie.mkv" }),
    ).toBe(false);
    expect(isBrowserReadyRelease({ id: "avi", title: "Movie 2026", filename: "movie.avi" })).toBe(
      false,
    );
    expect(isBrowserReadyRelease({ id: "no-name", title: "Movie 2026 1080p" })).toBe(false);
    expect(
      isBrowserReadyRelease({
        id: "web-ready",
        title: "Movie 2026",
        filename: "Movie.2026.mp4",
        notWebReady: true,
      }),
    ).toBe(false);
  });

  it("extracts the release details used by source cards", () => {
    expect(
      streamTechnicalTags("Movie 2008 4K UHD BluRay 2160p DoVi HDR TrueHD 7.1 Atmos H.265-MgB"),
    ).toEqual(["UHD BluRay", "Dolby Vision", "HDR", "TrueHD 7.1", "Atmos", "H.265"]);
  });
});
