import type { MovieStream } from "../types/api";

export const STREAM_QUALITY_ORDER = ["4K", "1080P", "720P", "480P", "360P", "Other"] as const;

export type StreamQuality = (typeof STREAM_QUALITY_ORDER)[number];

export interface StreamGroup {
  quality: StreamQuality;
  streams: MovieStream[];
}

const NON_ENGLISH_PROVIDERS = new Set([
  "anidex",
  "besttorrents",
  "bludv",
  "cinecalidad",
  "comando",
  "horriblesubs",
  "ilcorsaronero",
  "mejortorrent",
  "micoleaodublado",
  "nyaasi",
  "nekobt",
  "rutor",
  "rutracker",
  "tokyotosho",
  "torrent9",
  "wolfmax4k",
]);

const ENGLISH_AUDIO_TAG = /(?:^|[ ._[\]()/+-])(?:EN|ENG|ENGLISH)(?=$|[ ._[\]()/+-])/i;
const AMBIGUOUS_AUDIO_TAG = /(?:^|[ ._[\]()/+-])(?:MULTI\d*|DUAL[ ._-]?AUDIO)(?=$|[ ._[\]()/+-])/i;
const NON_ENGLISH_AUDIO_TAG =
  /(?:^|[ ._[\]()/+-])(?:ARABIC|BRAZILIAN|BULGARIAN|CANTONESE|CASTELLANO|CHINESE|CROATIAN|CZE|CZECH|DANISH|DEU|DEUTSCH|DUTCH|ESP|FINNISH|FRE|FRENCH|GER|GERMAN|GREEK|HEBREW|HINDI|HUNGARIAN|INDONESIAN|ITA|ITALIAN|JAPANESE|KOREAN|LATINO|MANDARIN|NORWEGIAN|PERSIAN|POL|POLISH|POR|PORTUGUESE|ROMANIAN|RUS|RUSSIAN|SERBIAN|SPA|SPANISH|SWEDISH|TAMIL|TELUGU|THAI|TRUEFRENCH|TURKISH|UKR|UKRAINIAN|VFQ|VIETNAMESE)(?=$|[ ._[\]()/+-])/i;

const BROWSER_SAFE_AUDIO_TAG = /(?:^|[^A-Z0-9])(?:AAC|MP3|OPUS)(?![A-Z])/i;
const BROWSER_UNSAFE_AUDIO_TAG =
  /(?:^|[^A-Z0-9])(?:E-?AC3|AC3|DD[P+]?|DTS|TRUEHD|DOLBY|ATMOS|FLAC|L?PCM)(?![A-Z])/i;
const RELEASE_CONTAINER_TAG = /\.(mp4|m4v|webm|mov|mkv|avi)(?:$|[^A-Z0-9])/i;

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

export function hasEnglishAudio(stream: MovieStream) {
  if (stream.audioLanguages?.length) return stream.audioLanguages.includes("en");

  const yearIndex = stream.title.search(/\b(?:19|20)\d{2}\b/);
  const releaseMetadata = yearIndex === -1 ? stream.title : stream.title.slice(yearIndex + 4);
  if (ENGLISH_AUDIO_TAG.test(releaseMetadata)) return true;

  const provider = stream.provider?.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (provider && NON_ENGLISH_PROVIDERS.has(provider)) return false;
  if (AMBIGUOUS_AUDIO_TAG.test(releaseMetadata)) return false;
  return !NON_ENGLISH_AUDIO_TAG.test(releaseMetadata);
}

export function isBrowserReadyRelease(stream: MovieStream) {
  if (stream.notWebReady) return false;

  const metadata = `${stream.title} ${stream.filename ?? ""}`;
  const container = RELEASE_CONTAINER_TAG.exec(metadata)?.[1]?.toLowerCase();
  const safeAudio = BROWSER_SAFE_AUDIO_TAG.test(metadata);
  const unsafeAudio = BROWSER_UNSAFE_AUDIO_TAG.test(metadata);

  if (container === "mkv") return safeAudio && !unsafeAudio;
  if (container === "mp4" || container === "m4v" || container === "webm" || container === "mov") {
    return safeAudio || !unsafeAudio;
  }
  return false;
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
