import { Injectable } from "@nestjs/common";

import { NormalizedStreamsResponse } from "src/modules/torrentio/interfaces/torrentio.interfaces";
import { TorrentioService } from "src/modules/torrentio/torrentio.service";

@Injectable()
export class StreamsService {
  constructor(private readonly torrentioService: TorrentioService) {}

  async getMovieStreams(movieId: number): Promise<NormalizedStreamsResponse> {
    return this.torrentioService.getMovieStreams(movieId);
  }
}
