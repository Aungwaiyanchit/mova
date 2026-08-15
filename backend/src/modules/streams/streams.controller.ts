import { Controller, Get, Param } from "@nestjs/common";
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from "@nestjs/swagger";

import { ParsePositiveIntPipe } from "src/common/pipes/parse-positive-int.pipe";
import { StreamsResponseDto } from "./dto/streams.dto";
import { StreamsService } from "./streams.service";

@ApiTags("Streams")
@Controller("movies")
export class StreamsController {
  constructor(private readonly streamsService: StreamsService) {}

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
}
