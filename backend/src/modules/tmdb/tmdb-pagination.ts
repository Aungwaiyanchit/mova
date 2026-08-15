import { BadRequestException } from "@nestjs/common";

import { TmdbPaginatedResponse } from "./interfaces/tmdb.interfaces";

const TMDB_PAGE_SIZE = 20;

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function paginateTmdb<T>(
  fetchPage: (page: number) => Promise<TmdbPaginatedResponse<T>>,
  page: number,
  limit: number,
): Promise<PaginatedResult<T>> {
  const startOffset = (page - 1) * limit;
  if (!Number.isSafeInteger(startOffset) || startOffset >= TMDB_PAGE_SIZE * 500) {
    throw new BadRequestException("Requested page exceeds the movie provider pagination limit");
  }
  const firstProviderPage = Math.floor(startOffset / TMDB_PAGE_SIZE) + 1;
  const offsetInFirstPage = startOffset % TMDB_PAGE_SIZE;
  const lastProviderPage = Math.floor((startOffset + limit - 1) / TMDB_PAGE_SIZE) + 1;

  const firstResponse = await fetchPage(firstProviderPage);
  const remainingPages = Array.from(
    {
      length: Math.max(
        0,
        Math.min(lastProviderPage, firstResponse.total_pages) - firstProviderPage,
      ),
    },
    (_, index) => firstProviderPage + index + 1,
  );
  const remainingResponses = await Promise.all(remainingPages.map(fetchPage));
  const results = [firstResponse, ...remainingResponses].flatMap((response) => response.results);
  const accessibleTotal = Math.min(
    firstResponse.total_results,
    firstResponse.total_pages * TMDB_PAGE_SIZE,
  );

  return {
    data: results.slice(offsetInFirstPage, offsetInFirstPage + limit),
    meta: {
      page,
      limit,
      total: accessibleTotal,
      totalPages: Math.ceil(accessibleTotal / limit),
    },
  };
}
