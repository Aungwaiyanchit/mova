import { HttpService } from "@nestjs/axios";
import {
  BadGatewayException,
  GatewayTimeoutException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { isAxiosError } from "axios";
import { firstValueFrom, map } from "rxjs";

import { TorrentioResponse, TorrentioStreamParams } from "./interfaces/torrentio.interfaces";

@Injectable()
export class TorrentioClient {
  private readonly logger = new Logger(TorrentioClient.name);
  private readonly baseUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl =
      this.configService.get<string>("torrentio.baseUrl") || "https://torrentio.strem.fun";
  }

  async getStreams(params: TorrentioStreamParams): Promise<TorrentioResponse> {
    const { type, id, season, episode } = params;

    let streamPath = `/stream/${type}/${id}.json`;

    if (type === "series" && season && episode) {
      streamPath = `/stream/${type}/${id}:${season}:${episode}.json`;
    }

    try {
      this.logger.debug(`Requesting Torrentio streams: ${this.baseUrl}${streamPath}`);

      const response = await firstValueFrom(
        this.httpService
          .get<TorrentioResponse>(`${this.baseUrl}${streamPath}`, {
            timeout: 15000,
          })
          .pipe(map((res) => res.data)),
      );

      return response;
    } catch (error) {
      if (isAxiosError(error)) {
        const status = error.response?.status;

        this.logger.error(`Torrentio Request Failed [${status}]: ${error.message}`);

        if (status === 404) {
          throw new BadGatewayException("Stream provider endpoint was not found");
        }
        if (status === 429) {
          throw new ServiceUnavailableException("Stream provider rate limit exceeded");
        }
        if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
          throw new GatewayTimeoutException("Stream provider timed out");
        }
        throw new BadGatewayException("Stream provider request failed");
      }
      throw error;
    }
  }
}
