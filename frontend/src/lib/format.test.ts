import { describe, expect, it } from "vitest";
import { formatRuntime, imageUrl, magnetUrl, movieYear } from "./format";

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
  });
});
