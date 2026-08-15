import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsOptional } from "class-validator";

import { PaginationDto, PaginationMetaDto } from "src/common/dto/pagination.dto";
import { MovieResponseDto } from "src/modules/movies/dto/movie.dto";

export enum TimeWindow {
  DAY = "day",
  WEEK = "week",
}

export class GetTrendingDto extends PaginationDto {
  @ApiProperty({
    enum: TimeWindow,
    example: TimeWindow.WEEK,
    required: false,
    default: TimeWindow.WEEK,
  })
  @IsOptional()
  @IsEnum(TimeWindow)
  timeWindow = TimeWindow.WEEK;
}

export class TrendingResponseDto {
  @ApiProperty({ type: [MovieResponseDto] })
  data!: MovieResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}
