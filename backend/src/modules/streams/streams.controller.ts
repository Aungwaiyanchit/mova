import { Controller, Get, Param, Query, Req, Res } from "@nestjs/common";
import { ApiOperation, ApiParam, ApiProduces, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Request, Response } from "express";

import { ParsePositiveIntPipe } from "src/common/pipes/parse-positive-int.pipe";
import { StreamVideoQueryDto } from "./dto/stream-video-query.dto";
import { StreamStatusResponseDto, StreamsResponseDto } from "./dto/streams.dto";
import { ParseInfoHashPipe } from "./parse-info-hash.pipe";
import { StreamsService } from "./streams.service";
import { TorrentStreamingService } from "./torrent-streaming.service";

@ApiTags("Streams")
@Controller("movies")
export class StreamsController {
  constructor(
    private readonly streamsService: StreamsService,
    private readonly torrentStreamingService: TorrentStreamingService,
  ) {}

  @Get(":id/streams")
  @ApiOperation({ summary: "Get streaming sources for a movie" })
  @ApiParam({ name: "id", description: "TMDB Movie ID", example: "123" })
  @ApiResponse({ status: 200, description: "Available streams", type: StreamsResponseDto })
  @ApiResponse({ status: 404, description: "Movie not found" })
  async getMovieStreams(
    @Param("id", ParsePositiveIntPipe) movieId: number,
  ): Promise<StreamsResponseDto> {
    const result = await this.streamsService.getMovieStreams(movieId);
    return result;
  }

  @Get(":id/streams/:infoHash/status")
  @ApiOperation({ summary: "Get live torrent streaming status" })
  @ApiParam({ name: "id", description: "TMDB Movie ID", example: "123" })
  @ApiParam({ name: "infoHash", description: "40-character torrent info hash" })
  @ApiResponse({
    status: 200,
    description: "Current torrent transfer status",
    type: StreamStatusResponseDto,
  })
  getMovieStreamStatus(
    @Param("id", ParsePositiveIntPipe) _movieId: number,
    @Param("infoHash", ParseInfoHashPipe) infoHash: string,
  ): StreamStatusResponseDto {
    return this.torrentStreamingService.getStreamStatus(infoHash);
  }

  @Get(":id/streams/:infoHash/video")
  @ApiOperation({ summary: "Stream a validated torrent source with HTTP range support" })
  @ApiParam({ name: "id", description: "TMDB Movie ID", example: "123" })
  @ApiParam({ name: "infoHash", description: "40-character torrent info hash" })
  @ApiProduces("video/mp4", "video/webm", "video/x-matroska")
  @ApiResponse({ status: 200, description: "Full video stream" })
  @ApiResponse({ status: 206, description: "Partial video stream" })
  async streamMovieSource(
    @Param("id", ParsePositiveIntPipe) movieId: number,
    @Param("infoHash", ParseInfoHashPipe) infoHash: string,
    @Query() query: StreamVideoQueryDto,
    @Req() request: Request,
    @Res() response: Response,
  ): Promise<void> {
    const prepared = await this.torrentStreamingService.prepareVideoStream(
      movieId,
      infoHash,
      query.fileIndex,
      request.headers.range,
    );

    response.status(prepared.statusCode).set(prepared.headers);
    request.once("aborted", () => prepared.stream.destroy());
    prepared.stream.once("error", (error) => response.destroy(error));
    prepared.stream.pipe(response);
  }
}
