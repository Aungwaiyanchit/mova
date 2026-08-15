import { ApiProperty } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";

import { PaginationDto, PaginationMetaDto } from "src/common/dto/pagination.dto";

export enum MovieSort {
  POPULARITY_ASC = "popularity.asc",
  POPULARITY_DESC = "popularity.desc",
  RELEASE_DATE_ASC = "primary_release_date.asc",
  RELEASE_DATE_DESC = "primary_release_date.desc",
  REVENUE_ASC = "revenue.asc",
  REVENUE_DESC = "revenue.desc",
  TITLE_ASC = "original_title.asc",
  TITLE_DESC = "original_title.desc",
  VOTE_AVERAGE_ASC = "vote_average.asc",
  VOTE_AVERAGE_DESC = "vote_average.desc",
  VOTE_COUNT_ASC = "vote_count.asc",
  VOTE_COUNT_DESC = "vote_count.desc",
}

export class GetMoviesDto extends PaginationDto {
  @ApiProperty({
    description: "Sort order",
    enum: MovieSort,
    example: MovieSort.POPULARITY_DESC,
    required: false,
  })
  @IsOptional()
  @IsEnum(MovieSort)
  sort?: MovieSort;

  @ApiProperty({ description: "Filter by year", example: 2024, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1888)
  @Max(2100)
  year?: number;

  @ApiProperty({ description: "Filter by genre ID", example: 28, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  genre?: number;
}

export class SearchMoviesDto extends PaginationDto {
  @ApiProperty({ description: "Search query", example: "oppenheimer" })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  q!: string;
}

export class MovieResponseDto {
  @ApiProperty({ example: 123 })
  id!: number;

  @ApiProperty({ example: "Movie Title" })
  title!: string;

  @ApiProperty({ example: "Original Title" })
  original_title!: string;

  @ApiProperty({ type: String, example: "/poster_path.jpg", nullable: true })
  poster_path!: string | null;

  @ApiProperty({ type: String, example: "/backdrop_path.jpg", nullable: true })
  backdrop_path!: string | null;

  @ApiProperty({ example: "2024-01-01" })
  release_date!: string;

  @ApiProperty({ example: 8.5 })
  vote_average!: number;

  @ApiProperty({ example: 1000 })
  vote_count!: number;

  @ApiProperty({ example: "Movie overview..." })
  overview!: string;
}

export class MoviesResponseDto {
  @ApiProperty({ type: [MovieResponseDto] })
  data!: MovieResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}

export class GenreDto {
  @ApiProperty({ example: 28 })
  id!: number;

  @ApiProperty({ example: "Action" })
  name!: string;
}

export class ProductionCompanyDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: "Studio" })
  name!: string;

  @ApiProperty({ type: String, example: "/logo.png", nullable: true })
  logo_path!: string | null;

  @ApiProperty({ example: "US" })
  origin_country!: string;
}

export class CastMemberResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: "Actor Name" })
  name!: string;

  @ApiProperty({ example: "Character Name" })
  character!: string;

  @ApiProperty({ example: "https://image.tmdb.org/t/p/w185/profile.jpg" })
  profile_image!: string;

  @ApiProperty({ example: "Acting" })
  department!: string;

  @ApiProperty({ example: 0 })
  order!: number;
}

export class MovieDetailResponseDto {
  @ApiProperty({ example: 123 })
  id!: number;

  @ApiProperty({ example: "Movie Title" })
  title!: string;

  @ApiProperty({ example: "Original Title" })
  original_title!: string;

  @ApiProperty({ example: "Movie overview..." })
  overview!: string;

  @ApiProperty({ example: "https://image.tmdb.org/t/p/w500/poster.jpg" })
  poster!: string;

  @ApiProperty({ example: "https://image.tmdb.org/t/p/w1280/backdrop.jpg" })
  backdrop!: string;

  @ApiProperty({ example: "2024-01-01" })
  release_date!: string;

  @ApiProperty({ type: Number, example: 120, nullable: true })
  runtime!: number | null;

  @ApiProperty({ type: [GenreDto] })
  genres!: { id: number; name: string }[];

  @ApiProperty({ example: 8.5 })
  vote_average!: number;

  @ApiProperty({ example: 1000 })
  vote_count!: number;

  @ApiProperty({ type: [ProductionCompanyDto] })
  production_companies!: {
    id: number;
    name: string;
    logo_path: string | null;
    origin_country: string;
  }[];

  @ApiProperty({ type: [CastMemberResponseDto] })
  cast!: {
    id: number;
    name: string;
    character: string;
    profile_image: string;
    department: string;
    order: number;
  }[];

  @ApiProperty({ type: [MovieResponseDto] })
  similar_movies!: MovieResponseDto[];
}

export class CastResponseDto {
  @ApiProperty({ type: [CastMemberResponseDto] })
  data!: CastMemberResponseDto[];
}
