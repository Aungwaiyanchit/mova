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

export function formatDataRate(bytesPerSecond: number) {
  if (!Number.isFinite(bytesPerSecond) || bytesPerSecond <= 0) return "0 KB/s";

  const units = ["B/s", "KB/s", "MB/s", "GB/s"];
  const unitIndex = Math.min(
    Math.max(Math.floor(Math.log(bytesPerSecond) / Math.log(1024)), 0),
    units.length - 1,
  );
  const value = bytesPerSecond / 1024 ** unitIndex;
  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

export function formatClockTime(seconds: number) {
  const total = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0;
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secondsPart = total % 60;
  const minuteText = hours ? String(minutes).padStart(2, "0") : String(minutes);
  const secondText = String(secondsPart).padStart(2, "0");
  return hours ? `${hours}:${minuteText}:${secondText}` : `${minuteText}:${secondText}`;
}

export function magnetUrl(infoHash: string, fileIndex?: number) {
  const index = fileIndex === undefined ? "" : `&fileIndex=${encodeURIComponent(fileIndex)}`;
  return `magnet:?xt=urn:btih:${encodeURIComponent(infoHash)}${index}`;
}
