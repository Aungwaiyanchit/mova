import { ApiProperty } from "@nestjs/swagger";

export class MovieStreamResponseDto {
  @ApiProperty({ example: "stream-1" })
  id!: string;

  @ApiProperty({ example: "Movie 1080p" })
  title!: string;

  @ApiProperty({ example: "1080p", required: false })
  quality?: string;

  @ApiProperty({ example: "torrent", required: false })
  type?: string;

  @ApiProperty({ example: "magnet:...", required: false })
  url?: string;

  @ApiProperty({ example: "abc123...", required: false })
  infoHash?: string;

  @ApiProperty({ example: 0, required: false })
  fileIndex?: number;

  @ApiProperty({ example: "2.5 GB", required: false })
  size?: string;

  @ApiProperty({ example: 150, required: false })
  seeders?: number;
}

export class StreamsResponseDto {
  @ApiProperty({ example: 123 })
  movieId!: number;

  @ApiProperty({ type: [MovieStreamResponseDto] })
  streams!: MovieStreamResponseDto[];
}

export class StreamStatusResponseDto {
  @ApiProperty({
    description: "Current torrent download rate in bytes per second",
    example: 3145728,
  })
  downloadSpeed!: number;
}
