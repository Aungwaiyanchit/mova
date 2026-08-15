import { Module } from "@nestjs/common";
import { TmdbModule } from "../tmdb/tmdb.module";
import { GenresController } from "./genres.controller";
import { GenresService } from "./genres.service";

@Module({
  imports: [TmdbModule],
  controllers: [GenresController],
  providers: [GenresService],
})
export class GenresModule {}
