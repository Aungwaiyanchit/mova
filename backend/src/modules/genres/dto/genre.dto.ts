import { ApiProperty } from "@nestjs/swagger";

import { PaginationDto, PaginationMetaDto } from "src/common/dto/pagination.dto";
import { MovieResponseDto } from "src/modules/movies/dto/movie.dto";

export class GetGenresMoviesDto extends PaginationDto {}

export class GenreResponseDto {
  @ApiProperty({ example: 28 })
  id!: number;

  @ApiProperty({ example: "Action" })
  name!: string;
}

export class GenresResponseDto {
  @ApiProperty({ type: [GenreResponseDto] })
  data!: GenreResponseDto[];
}

export class GenresMoviesResponseDto {
  @ApiProperty({ type: [MovieResponseDto] })
  data!: MovieResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}
