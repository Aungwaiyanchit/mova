import { HttpModule } from "@nestjs/axios";
import { Module } from "@nestjs/common";
import { TmdbModule } from "../tmdb/tmdb.module";
import { TorrentioModule } from "../torrentio/torrentio.module";
import { StreamsController } from "./streams.controller";
import { StreamsService } from "./streams.service";
import { SubtitlesService } from "./subtitles.service";
import { TorrentStreamingService } from "./torrent-streaming.service";

@Module({
  imports: [HttpModule, TmdbModule, TorrentioModule],
  controllers: [StreamsController],
  providers: [StreamsService, SubtitlesService, TorrentStreamingService],
})
export class StreamsModule {}
