import { beforeEach, describe, expect, it } from "vitest";
import { applyTheme, getStoredTheme, persistTheme } from "./themes";

describe("theme persistence", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
    document.head.querySelector('meta[name="theme-color"]')?.remove();
    const meta = document.createElement("meta");
    meta.name = "theme-color";
    meta.content = "#081014";
    document.head.append(meta);
  });

  it("uses plum tide when storage is absent or malformed", () => {
    expect(getStoredTheme()).toBe("plum-tide");
    localStorage.setItem("mova-theme", "not-json");
    expect(getStoredTheme()).toBe("plum-tide");
  });

  it("persists and applies a supported preset", () => {
    persistTheme("blue-hour");
    applyTheme(getStoredTheme());
    expect(getStoredTheme()).toBe("blue-hour");
    expect(document.documentElement.dataset.theme).toBe("blue-hour");
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute("content")).toBe(
      "#091018",
    );
  });
});
