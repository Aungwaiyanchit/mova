import { HttpService } from "@nestjs/axios";
import { BadGatewayException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { isAxiosError } from "axios";
import { firstValueFrom, map } from "rxjs";
import { CacheService } from "src/common/cache/cache.service";
import { TmdbService } from "src/modules/tmdb/tmdb.service";

interface ProviderSubtitle {
  id: string;
  lang: string;
  url: string;
}

interface ProviderSubtitleResponse {
  subtitles: ProviderSubtitle[];
}

interface SubtitleRecord extends SubtitleTrack {
  url: string;
}

export interface SubtitleTrack {
  id: string;
  language: string;
  label: string;
}

const LANGUAGE_DETAILS: Record<string, { language: string; label: string }> = {
  alb: { language: "sq", label: "Albanian" },
  ara: { language: "ar", label: "Arabic" },
  bos: { language: "bs", label: "Bosnian" },
  bul: { language: "bg", label: "Bulgarian" },
  cze: { language: "cs", label: "Czech" },
  dan: { language: "da", label: "Danish" },
  dut: { language: "nl", label: "Dutch" },
  ell: { language: "el", label: "Greek" },
  eng: { language: "en", label: "English" },
  fin: { language: "fi", label: "Finnish" },
  fre: { language: "fr", label: "French" },
  heb: { language: "he", label: "Hebrew" },
  hrv: { language: "hr", label: "Croatian" },
  nld: { language: "nl", label: "Dutch" },
  nor: { language: "no", label: "Norwegian" },
  pob: { language: "pt-BR", label: "Portuguese (Brazil)" },
  por: { language: "pt", label: "Portuguese" },
  ron: { language: "ro", label: "Romanian" },
  slo: { language: "sk", label: "Slovak" },
  slv: { language: "sl", label: "Slovenian" },
  spa: { language: "es", label: "Spanish" },
  srp: { language: "sr", label: "Serbian" },
  tur: { language: "tr", label: "Turkish" },
};

export function convertSrtToVtt(subtitle: string): string {
  const normalized = subtitle.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
  const webVtt = normalized.startsWith("WEBVTT")
    ? normalized
    : `WEBVTT\n\n${normalized.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, "$1.$2")}`;
  return webVtt.replace(/^([^\n]*-->[^\n]*)$/gm, (cue) =>
    /\bline:/.test(cue) ? cue : `${cue} line:90% position:50% align:center`,
  );
}

@Injectable()
export class SubtitlesService {
  private readonly baseUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly cacheService: CacheService,
    private readonly tmdbService: TmdbService,
  ) {
    this.baseUrl =
      this.configService.get<string>("subtitles.baseUrl") || "https://opensubtitles-v3.strem.io";
  }

  async getMovieSubtitles(movieId: number): Promise<SubtitleTrack[]> {
    const subtitles = await this.getSubtitleRecords(movieId);
    return subtitles.map(({ id, language, label }) => ({ id, language, label }));
  }

  async getSubtitleFile(movieId: number, subtitleId: string): Promise<string> {
    const subtitles = await this.getSubtitleRecords(movieId);
    const subtitle = subtitles.find((item) => item.id === subtitleId);
    if (!subtitle) throw new NotFoundException("Subtitle track was not found");

    try {
      const content = await firstValueFrom(
        this.httpService
          .get<string>(subtitle.url, { responseType: "text", timeout: 15000 })
          .pipe(map((response) => response.data)),
      );
      return convertSrtToVtt(content);
    } catch (error) {
      if (isAxiosError(error)) throw new BadGatewayException("Subtitle file could not be loaded");
      throw error;
    }
  }

  private async getSubtitleRecords(movieId: number): Promise<SubtitleRecord[]> {
    return this.cacheService.getOrSet(
      `subtitles:movie:${movieId}`,
      async () => {
        const externalIds = await this.tmdbService.getMovieExternalIds(movieId);
        if (!externalIds.imdb_id) return [];

        try {
          const response = await firstValueFrom(
            this.httpService
              .get<ProviderSubtitleResponse>(
                `${this.baseUrl}/subtitles/movie/${encodeURIComponent(externalIds.imdb_id)}.json`,
                { timeout: 15000 },
              )
              .pipe(map((result) => result.data)),
          );
          return this.normalizeSubtitles(response.subtitles);
        } catch (error) {
          if (isAxiosError(error))
            throw new BadGatewayException("Subtitle provider did not respond");
          throw error;
        }
      },
      24 * 60 * 60,
    );
  }

  private normalizeSubtitles(subtitles: ProviderSubtitle[]): SubtitleRecord[] {
    const languages = new Set<string>();
    const tracks: SubtitleRecord[] = [];

    for (const subtitle of subtitles) {
      const details = LANGUAGE_DETAILS[subtitle.lang.toLowerCase()] ?? {
        language: subtitle.lang.toLowerCase(),
        label: subtitle.lang.toUpperCase(),
      };
      if (languages.has(details.language)) continue;
      languages.add(details.language);
      tracks.push({ id: subtitle.id, url: subtitle.url, ...details });
    }

    return tracks.sort((first, second) => {
      if (first.language === "en") return -1;
      if (second.language === "en") return 1;
      return first.label.localeCompare(second.label);
    });
  }
}
