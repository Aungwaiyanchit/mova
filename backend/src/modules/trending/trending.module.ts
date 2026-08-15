import { Module } from "@nestjs/common";
import { TmdbModule } from "../tmdb/tmdb.module";
import { TrendingService } from "./trending.service";

@Module({
  imports: [TmdbModule],
  providers: [TrendingService],
  exports: [TrendingService],
})
export class TrendingModule {}
