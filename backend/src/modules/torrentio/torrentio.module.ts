import { HttpModule } from "@nestjs/axios";
import { Module } from "@nestjs/common";
import { CacheModule } from "src/common/cache/cache.module";
import { TmdbModule } from "../tmdb/tmdb.module";
import { TorrentioClient } from "./torrentio.client";
import { TorrentioService } from "./torrentio.service";

@Module({
  imports: [
    HttpModule.register({
      timeout: 15000,
      maxRedirects: 3,
    }),
    CacheModule,
    TmdbModule,
  ],
  providers: [TorrentioClient, TorrentioService],
  exports: [TorrentioService],
})
export class TorrentioModule {}
