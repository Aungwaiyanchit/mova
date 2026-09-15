export const themes = [
  {
    id: "plum-tide",
    name: "Plum tide",
    page: "#081014",
    swatches: ["#79697b", "#007595"],
  },
  {
    id: "blue-hour",
    name: "Blue hour",
    page: "#091018",
    swatches: ["#44566c", "#2b6ea8"],
  },
  {
    id: "ember-room",
    name: "Ember room",
    page: "#120e0c",
    swatches: ["#7e5b52", "#a4532e"],
  },
] as const;

export type ThemeId = (typeof themes)[number]["id"];

const STORAGE_KEY = "mova-theme";
const STORAGE_VERSION = 1;

export function isThemeId(value: unknown): value is ThemeId {
  return themes.some((theme) => theme.id === value);
}

export function getStoredTheme(): ThemeId {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") as {
      version?: number;
      theme?: unknown;
    } | null;
    if (value?.version === STORAGE_VERSION && isThemeId(value.theme)) return value.theme;
  } catch {
    // Ignore malformed browser storage and fall back to the designed default.
  }
  return "plum-tide";
}

export function applyTheme(theme: ThemeId) {
  document.documentElement.dataset.theme = theme;
  const page = themes.find((item) => item.id === theme)?.page ?? "#081014";
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", page);
}

export function persistTheme(theme: ThemeId) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: STORAGE_VERSION, theme }));
}
