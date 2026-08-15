import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Inject, Injectable, Logger } from "@nestjs/common";
import { Cache } from "cache-manager";

export interface ICacheStore {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  del(key: string): Promise<void>;
  getOrSet<T>(key: string, factory: () => Promise<T>, ttl?: number): Promise<T>;
}

@Injectable()
export class CacheService implements ICacheStore {
  private readonly logger = new Logger(CacheService.name);

  constructor(@Inject(CACHE_MANAGER) private readonly _cacheManager: Cache) {}

  async get<T>(key: string): Promise<T | null> {
    try {
      const cached = await this._cacheManager.get<T>(key);
      return cached ?? null;
    } catch (error) {
      this.logger.warn(`Failed to get key '${key}' from cache: ${(error as Error).message}`);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      const ttlMs = ttl === undefined ? undefined : ttl * 1000;
      await this._cacheManager.set(key, value, ttlMs);
    } catch (error) {
      this.logger.warn(`Failed to set key '${key}' in cache: ${(error as Error).message}`);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this._cacheManager.del(key);
    } catch (error) {
      this.logger.warn(`Failed to delete key '${key}' from cache: ${(error as Error).message}`);
    }
  }

  async getOrSet<T>(key: string, factory: () => Promise<T>, ttl?: number): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    await this.set(key, value, ttl);
    return value;
  }
}
