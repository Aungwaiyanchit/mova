import { CacheModule } from "@nestjs/cache-manager";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Test, TestingModule } from "@nestjs/testing";

import { CacheService } from "./cache.service";

describe("CacheService", () => {
  let service: CacheService;
  let cacheManager: {
    get: jest.Mock;
    set: jest.Mock;
    del: jest.Mock;
  };

  beforeEach(async () => {
    cacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [CacheModule.register()],
      providers: [
        CacheService,
        {
          provide: CACHE_MANAGER,
          useValue: cacheManager,
        },
      ],
    }).compile();

    service = module.get<CacheService>(CacheService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("get", () => {
    it("should return cached value", async () => {
      cacheManager.get.mockResolvedValue("cached-value");

      const result = await service.get("test-key");

      expect(result).toBe("cached-value");
      expect(cacheManager.get).toHaveBeenCalledWith("test-key");
    });

    it("should return null when key not found", async () => {
      cacheManager.get.mockResolvedValue(null);

      const result = await service.get("test-key");

      expect(result).toBeNull();
    });

    it("should return null on error", async () => {
      cacheManager.get.mockRejectedValue(new Error("Cache error"));

      const result = await service.get("test-key");

      expect(result).toBeNull();
    });
  });

  describe("set", () => {
    it("should set value in cache", async () => {
      cacheManager.set.mockResolvedValue(undefined);

      await service.set("test-key", "test-value", 3600);

      expect(cacheManager.set).toHaveBeenCalledWith("test-key", "test-value", 3600000);
    });

    it("should set value without TTL", async () => {
      cacheManager.set.mockResolvedValue(undefined);

      await service.set("test-key", "test-value");

      expect(cacheManager.set).toHaveBeenCalledWith("test-key", "test-value", undefined);
    });

    it("should handle errors gracefully", async () => {
      cacheManager.set.mockRejectedValue(new Error("Cache error"));

      await expect(service.set("test-key", "test-value")).resolves.not.toThrow();
    });
  });

  describe("del", () => {
    it("should delete key from cache", async () => {
      cacheManager.del.mockResolvedValue(true);

      await service.del("test-key");

      expect(cacheManager.del).toHaveBeenCalledWith("test-key");
    });

    it("should handle errors gracefully", async () => {
      cacheManager.del.mockRejectedValue(new Error("Cache error"));

      await expect(service.del("test-key")).resolves.not.toThrow();
    });
  });

  describe("getOrSet", () => {
    it("should return cached value when exists", async () => {
      cacheManager.get.mockResolvedValue("cached-value");

      const factory = jest.fn().mockResolvedValue("factory-value");

      const result = await service.getOrSet("test-key", factory, 3600);

      expect(result).toBe("cached-value");
      expect(factory).not.toHaveBeenCalled();
    });

    it("should call factory and cache result when not cached", async () => {
      cacheManager.get.mockResolvedValue(null);
      cacheManager.set.mockResolvedValue(undefined);

      const factory = jest.fn().mockResolvedValue("factory-value");

      const result = await service.getOrSet("test-key", factory, 3600);

      expect(result).toBe("factory-value");
      expect(factory).toHaveBeenCalled();
      expect(cacheManager.set).toHaveBeenCalledWith("test-key", "factory-value", 3600000);
    });
  });
});
