import { useQuery } from "@tanstack/react-query";
import { SlidersHorizontal } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { PageLoading } from "../components/loading";
import { MovieGrid } from "../components/movie-grid";
import { Pagination } from "../components/pagination";
import { StatePanel } from "../components/state-panel";
import { api } from "../lib/api";
import type { MovieSort } from "../types/api";

const PAGE_SIZE = 20;
const SORT_OPTIONS: { value: MovieSort; label: string }[] = [
  { value: "popularity.desc", label: "Most popular" },
  { value: "primary_release_date.desc", label: "Newest releases" },
  { value: "vote_average.desc", label: "Highest rated" },
  { value: "original_title.asc", label: "Title A–Z" },
];

function positiveNumber(value: string | null, fallback: number) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : fallback;
}

export default function MoviesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = positiveNumber(searchParams.get("page"), 1);
  const genre = positiveNumber(searchParams.get("genre"), 0) || undefined;
  const year = positiveNumber(searchParams.get("year"), 0) || undefined;
  const requestedSort = searchParams.get("sort") as MovieSort | null;
  const sort = SORT_OPTIONS.some((option) => option.value === requestedSort)
    ? (requestedSort as MovieSort)
    : "popularity.desc";

  const moviesQuery = useQuery({
    queryKey: ["movies", { page, genre, year, sort }],
    queryFn: () => api.getMovies({ page, limit: PAGE_SIZE, genre, year, sort }),
    placeholderData: (previousData) => previousData,
  });
  const genresQuery = useQuery({
    queryKey: ["genres"],
    queryFn: api.getGenres,
    staleTime: 24 * 60 * 60 * 1000,
  });

  function updateFilter(key: string, value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    setSearchParams(next);
  }

  function changePage(nextPage: number) {
    const next = new URLSearchParams(searchParams);
    if (nextPage === 1) next.delete("page");
    else next.set("page", String(nextPage));
    setSearchParams(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 50 }, (_, index) => currentYear - index);

  if (moviesQuery.isPending) return <PageLoading />;

  return (
    <div className="page-shell py-12 sm:py-16">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[0.65rem] font-extrabold uppercase tracking-[0.24em] text-accent-bright">
            The complete reel
          </p>
          <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
            Movie archive
          </h1>
        </div>
        {moviesQuery.data ? (
          <p className="text-sm font-semibold text-faint">
            {moviesQuery.data.meta.total.toLocaleString()} available titles
          </p>
        ) : null}
      </div>

      <div className="my-9 rounded-xl border border-line bg-page-raised p-4 sm:p-5">
        <div className="mb-4 flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.18em] text-muted">
          <SlidersHorizontal className="size-4 text-accent-bright" aria-hidden="true" />
          Tune the selection
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="grid gap-1.5 text-xs font-bold text-faint">
            Genre
            <select
              className="h-11 rounded-lg border border-line bg-surface px-3 text-sm text-ink outline-none focus:border-accent"
              value={genre ?? ""}
              onChange={(event) => updateFilter("genre", event.target.value)}
            >
              <option value="">All genres</option>
              {genresQuery.data?.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-xs font-bold text-faint">
            Release year
            <select
              className="h-11 rounded-lg border border-line bg-surface px-3 text-sm text-ink outline-none focus:border-accent"
              value={year ?? ""}
              onChange={(event) => updateFilter("year", event.target.value)}
            >
              <option value="">Any year</option>
              {years.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-xs font-bold text-faint">
            Order
            <select
              className="h-11 rounded-lg border border-line bg-surface px-3 text-sm text-ink outline-none focus:border-accent"
              value={sort}
              onChange={(event) => updateFilter("sort", event.target.value)}
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {moviesQuery.isError ? (
        <StatePanel
          kind="error"
          title="This reel would not load"
          message="The movie archive could not be reached with these filters."
          actionLabel="Try again"
          onAction={() => moviesQuery.refetch()}
        />
      ) : null}
      {moviesQuery.data?.data.length === 0 ? (
        <StatePanel
          title="No films match"
          message="Try a different genre, year, or sort order to widen the selection."
        />
      ) : null}
      {moviesQuery.data?.data.length ? (
        <div className={moviesQuery.isFetching ? "opacity-55 transition" : "transition"}>
          <MovieGrid movies={moviesQuery.data.data} />
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            totalPages={moviesQuery.data.meta.totalPages}
            onPageChange={changePage}
          />
        </div>
      ) : null}
    </div>
  );
}
