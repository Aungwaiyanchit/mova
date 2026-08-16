import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, IsOptional, Min } from "class-validator";

export class StreamVideoQueryDto {
  @ApiPropertyOptional({ minimum: 0, description: "Torrent file index" })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  fileIndex?: number;
}
