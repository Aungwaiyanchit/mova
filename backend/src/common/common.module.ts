import { Module } from "@nestjs/common";
import { CacheModule } from "./cache/cache.module";

@Module({
  imports: [CacheModule],
  exports: [CacheModule],
})
export class CommonModule {}
