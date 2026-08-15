import { Module } from "@nestjs/common";
import { TmdbModule } from "../tmdb/tmdb.module";
import { TrendingModule } from "../trending/trending.module";
import { MoviesController } from "./movies.controller";
import { MoviesService } from "./movies.service";

@Module({
  imports: [TmdbModule, TrendingModule],
  controllers: [MoviesController],
  providers: [MoviesService],
})
export class MoviesModule {}
