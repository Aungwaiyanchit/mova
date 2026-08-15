import { HttpModule } from "@nestjs/axios";
import { Module } from "@nestjs/common";
import { CacheModule } from "src/common/cache/cache.module";
import { TmdbClient } from "./tmdb.client";
import { TmdbService } from "./tmdb.service";

@Module({
  imports: [
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 3,
    }),
    CacheModule,
  ],
  providers: [TmdbClient, TmdbService],
  exports: [TmdbService],
})
export class TmdbModule {}
