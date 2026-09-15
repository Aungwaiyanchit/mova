import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { PageLoading } from "../components/loading";
import { MovieGrid } from "../components/movie-grid";
import { Pagination } from "../components/pagination";
import { SearchBox } from "../components/search-box";
import { StatePanel } from "../components/state-panel";
import { api } from "../lib/api";

const PAGE_SIZE = 20;

function pageNumber(value: string | null) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : 1;
}

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = (searchParams.get("q") || "").trim();
  const page = pageNumber(searchParams.get("page"));
  const resultsQuery = useQuery({
    queryKey: ["search", query, page],
    queryFn: () => api.searchMovies(query, page, PAGE_SIZE),
    enabled: Boolean(query),
    placeholderData: (previousData) => previousData,
  });

  function changePage(nextPage: number) {
    const next = new URLSearchParams(searchParams);
    if (nextPage === 1) next.delete("page");
    else next.set("page", String(nextPage));
    setSearchParams(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (!query) {
    return (
      <div className="page-shell py-16">
        <StatePanel
          title="What are you looking for?"
          message="Search by movie title in the field above, or type it here."
        />
        <div className="mx-auto mt-6 max-w-md">
          <SearchBox compact />
        </div>
      </div>
    );
  }

  if (resultsQuery.isPending) return <PageLoading />;

  return (
    <div className="page-shell py-12 sm:py-16">
      <div className="mb-10 border-b border-line pb-8">
        <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.24em] text-accent-bright">
          <Search className="size-3.5" aria-hidden="true" />
          Search results
        </div>
        <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
          “{query}”
        </h1>
        {resultsQuery.data ? (
          <p className="mt-3 text-sm text-muted">
            {resultsQuery.data.meta.total.toLocaleString()} matching titles
          </p>
        ) : null}
      </div>

      {resultsQuery.isError ? (
        <StatePanel
          kind="error"
          title="Search failed"
          message="The movie service did not complete this search."
          actionLabel="Search again"
          onAction={() => resultsQuery.refetch()}
        />
      ) : null}
      {resultsQuery.data?.data.length === 0 ? (
        <StatePanel
          title="No matching titles"
          message={`Nothing matched “${query}”. Check the spelling or try a broader title.`}
        />
      ) : null}
      {resultsQuery.data?.data.length ? (
        <div aria-busy={resultsQuery.isFetching}>
          {resultsQuery.isFetching ? (
            <div
              className="mb-4 h-0.5 overflow-hidden rounded-full bg-surface"
              role="status"
              aria-label="Updating results"
            >
              <div className="h-full w-1/3 animate-pulse bg-accent-bright" />
            </div>
          ) : null}
          <MovieGrid movies={resultsQuery.data.data} />
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            totalPages={resultsQuery.data.meta.totalPages}
            onPageChange={changePage}
          />
        </div>
      ) : null}
    </div>
  );
}
