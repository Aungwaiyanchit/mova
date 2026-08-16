import { Injectable, NotFoundException, UnprocessableEntityException } from "@nestjs/common";

import {
  MovieStream,
  NormalizedStreamsResponse,
} from "src/modules/torrentio/interfaces/torrentio.interfaces";
import { TorrentioService } from "src/modules/torrentio/torrentio.service";

@Injectable()
export class StreamsService {
  constructor(private readonly torrentioService: TorrentioService) {}

  async getMovieStreams(movieId: number): Promise<NormalizedStreamsResponse> {
    return this.torrentioService.getMovieStreams(movieId);
  }

  async resolveTorrentSource(
    movieId: number,
    infoHash: string,
    fileIndex?: number,
  ): Promise<MovieStream> {
    const response = await this.getMovieStreams(movieId);
    const sources = response.streams.filter(
      (stream) => stream.infoHash?.toLowerCase() === infoHash && stream.type === "torrent",
    );
    const source =
      fileIndex === undefined
        ? sources[0]
        : sources.find((stream) => stream.fileIndex === fileIndex);

    if (!source) throw new NotFoundException("This torrent source is not available for the movie");
    if (!source.infoHash) throw new UnprocessableEntityException("Torrent source has no info hash");
    return source;
  }
}
