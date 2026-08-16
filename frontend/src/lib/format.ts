const TMDB_IMAGE_URL = "https://image.tmdb.org/t/p";

export function imageUrl(
  path: string | null | undefined,
  size: "w342" | "w500" | "w780" | "w1280",
) {
  if (!path) return undefined;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${TMDB_IMAGE_URL}/${size}${path}`;
}

export function movieYear(releaseDate: string) {
  return releaseDate ? releaseDate.slice(0, 4) : "TBA";
}

export function formatRuntime(minutes: number | null) {
  if (!minutes) return undefined;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return hours ? `${hours}h ${remainingMinutes}m` : `${remainingMinutes}m`;
}

export function formatVotes(votes: number) {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(
    votes,
  );
}

export function magnetUrl(infoHash: string) {
  return `magnet:?xt=urn:btih:${encodeURIComponent(infoHash)}`;
}
