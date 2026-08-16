import { Module } from "@nestjs/common";
import { TorrentioModule } from "../torrentio/torrentio.module";
import { StreamsController } from "./streams.controller";
import { StreamsService } from "./streams.service";
import { TorrentStreamingService } from "./torrent-streaming.service";

@Module({
  imports: [TorrentioModule],
  controllers: [StreamsController],
  providers: [StreamsService, TorrentStreamingService],
})
export class StreamsModule {}
