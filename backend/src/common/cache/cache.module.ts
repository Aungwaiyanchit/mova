import { CacheModule as NestCacheModule } from "@nestjs/cache-manager";
import { Global, Module } from "@nestjs/common";
import { CacheService } from "./cache.service";

@Global()
@Module({
  imports: [
    NestCacheModule.register({
      isGlobal: true,
      ttl: 3600 * 1000,
      max: 100,
    }),
  ],
  providers: [CacheService],
  exports: [CacheService],
})
export class CacheModule {}
