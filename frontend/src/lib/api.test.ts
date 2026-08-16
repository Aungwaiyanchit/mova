import { afterEach, describe, expect, it, vi } from "vitest";
import { type ApiError, api } from "./api";

describe("API client", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("turns backend error payloads into typed errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            statusCode: 400,
            message: ["page must not be less than 1", "limit must not be greater than 100"],
          }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );

    await expect(api.getPopular()).rejects.toEqual(
      expect.objectContaining<ApiError>({
        name: "ApiError",
        status: 400,
        message: "page must not be less than 1. limit must not be greater than 100",
      }),
    );
  });
});
