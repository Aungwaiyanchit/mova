import { describe, expect, it } from "vitest";
import {
  formatClockTime,
  formatDataRate,
  formatRuntime,
  imageUrl,
  magnetUrl,
  movieYear,
} from "./format";

describe("format helpers", () => {
  it("builds list artwork URLs but preserves absolute detail URLs", () => {
    expect(imageUrl("/poster.jpg", "w342")).toBe("https://image.tmdb.org/t/p/w342/poster.jpg");
    expect(imageUrl("https://images.example/poster.jpg", "w500")).toBe(
      "https://images.example/poster.jpg",
    );
    expect(imageUrl(null, "w342")).toBeUndefined();
  });

  it("formats movie metadata", () => {
    expect(movieYear("1999-10-15")).toBe("1999");
    expect(movieYear("")).toBe("TBA");
    expect(formatRuntime(139)).toBe("2h 19m");
    expect(formatRuntime(null)).toBeUndefined();
  });

  it("creates a magnet URI from an info hash", () => {
    expect(magnetUrl("abc123")).toBe("magnet:?xt=urn:btih:abc123");
    expect(magnetUrl("abc123", 2)).toBe("magnet:?xt=urn:btih:abc123&fileIndex=2");
  });

  it("formats live transfer rates", () => {
    expect(formatDataRate(0)).toBe("0 KB/s");
    expect(formatDataRate(1_536)).toBe("1.5 KB/s");
    expect(formatDataRate(3 * 1024 ** 2)).toBe("3.0 MB/s");
  });

  it("formats playback clock times", () => {
    expect(formatClockTime(0)).toBe("0:00");
    expect(formatClockTime(65)).toBe("1:05");
    expect(formatClockTime(5945)).toBe("1:39:05");
    expect(formatClockTime(Number.NaN)).toBe("0:00");
  });
});
