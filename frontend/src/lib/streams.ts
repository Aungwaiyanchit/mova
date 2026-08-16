import type { MovieStream } from "../types/api";

export const STREAM_QUALITY_ORDER = ["4K", "1080P", "720P", "480P", "360P", "Other"] as const;

export type StreamQuality = (typeof STREAM_QUALITY_ORDER)[number];

export interface StreamGroup {
  quality: StreamQuality;
  streams: MovieStream[];
}

function isPrivateHost(hostname: string) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) return true;
  if (host === "::1" || host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe80")) {
    return true;
  }

  const octets = host.split(".").map(Number);
  if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet))) return false;
  const [first, second] = octets;
  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 169 && second === 254) ||
    (first === 172 && second !== undefined && second >= 16 && second <= 31) ||
    (first === 192 && second === 168)
  );
}

function httpSourceUrl(rawUrl: string | undefined) {
  if (!rawUrl) return undefined;

  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "https:" && url.protocol !== "http:") return undefined;
    if (import.meta.env.PROD && (url.protocol !== "https:" || isPrivateHost(url.hostname))) {
      return undefined;
    }
    return rawUrl;
  } catch {
    return undefined;
  }
}

export function streamQuality(stream: MovieStream): StreamQuality {
  const label = `${stream.quality ?? ""} ${stream.title}`.toUpperCase();
  if (label.includes("4K") || label.includes("2160")) return "4K";
  if (label.includes("1080")) return "1080P";
  if (label.includes("720")) return "720P";
  if (label.includes("480")) return "480P";
  if (label.includes("360")) return "360P";
  return "Other";
}

export function groupStreamsByQuality(streams: MovieStream[]): StreamGroup[] {
  const groups = new Map<StreamQuality, MovieStream[]>();

  for (const stream of streams) {
    const quality = streamQuality(stream);
    const group = groups.get(quality);
    if (group) group.push(stream);
    else groups.set(quality, [stream]);
  }

  return STREAM_QUALITY_ORDER.flatMap((quality) => {
    const group = groups.get(quality);
    const ranked = group
      ?.slice()
      .sort((first, second) => (second.seeders ?? -1) - (first.seeders ?? -1))
      .slice(0, 4);
    return ranked?.length ? [{ quality, streams: ranked }] : [];
  });
}

export function directStreamUrl(stream: MovieStream) {
  if (stream.type?.toLowerCase() === "torrent" || /\.torrent(?:$|[?#])/i.test(stream.url ?? "")) {
    return undefined;
  }
  return httpSourceUrl(stream.url);
}

export function isHlsStream(url: string, type?: string) {
  return (
    type?.toLowerCase() === "hls" ||
    /\.m3u8(?:$|[?#&])/i.test(url) ||
    /[?&](?:format|type)=(?:hls|m3u8)(?:$|&)/i.test(url)
  );
}

export function streamTechnicalTags(title: string) {
  const release = title.toUpperCase();
  const tags: string[] = [];

  if (/\bUHD[ ._-]*BLU-?RAY\b|\bUHD[ ._-]*BLURAY\b/.test(release)) tags.push("UHD BluRay");
  else if (/\bBLU-?RAY\b|\bBLURAY\b/.test(release)) tags.push("BluRay");
  else if (/\bWEB[ ._-]*DL\b/.test(release)) tags.push("WEB-DL");
  else if (/\bWEBRIP\b/.test(release)) tags.push("WEBRip");

  if (/\bDOVI\b|\bDOLBY[ ._-]*VISION\b/.test(release)) tags.push("Dolby Vision");
  if (/\bHDR10\+/.test(release)) tags.push("HDR10+");
  else if (/\bHDR10\b/.test(release)) tags.push("HDR10");
  else if (/\bHDR\b/.test(release)) tags.push("HDR");
  if (/\bTRUEHD\b/.test(release)) tags.push(release.includes("7.1") ? "TrueHD 7.1" : "TrueHD");
  if (/\bATMOS\b/.test(release)) tags.push("Atmos");
  if (/\bH[ ._-]?265\b|\bHEVC\b/.test(release)) tags.push("H.265");
  else if (/\bH[ ._-]?264\b|\bAVC\b/.test(release)) tags.push("H.264");

  return tags;
}
