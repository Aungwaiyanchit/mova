export const TORRENT_TRACKERS = [
  "udp://tracker.opentrackr.org:1337/announce",
  "udp://tracker.openbittorrent.com:6969/announce",
  "udp://exodus.desync.com:6969/announce",
  "udp://tracker.coppersurfer.tk:6969/announce",
  "udp://open.stealth.si:80/announce",
  "udp://tracker.torrent.eu.org:451/announce",
] as const;

export const TORRENT_METADATA_TIMEOUT_MS = 30_000;
export const TORRENT_IDLE_TTL_MS = 5 * 60_000;
export const TORRENT_SWEEP_INTERVAL_MS = 60_000;

export const VIDEO_MIME_TYPES: Record<string, string> = {
  ".avi": "video/x-msvideo",
  ".m4v": "video/x-m4v",
  ".mkv": "video/x-matroska",
  ".mov": "video/quicktime",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
};
