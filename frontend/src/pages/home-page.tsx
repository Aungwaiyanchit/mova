import { useQueries } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { FeaturedHero } from "../components/featured-hero";
import { PageLoading } from "../components/loading";
import { MovieRail } from "../components/movie-rail";
import { StatePanel } from "../components/state-panel";
import { api } from "../lib/api";
import type { TimeWindow } from "../types/api";

export default function HomePage() {
  const [timeWindow, setTimeWindow] = useState<TimeWindow>("week");
  const [trendingQuery, popularQuery, genresQuery] = useQueries({
    queries: [
      {
        queryKey: ["trending", timeWindow, 12],
        queryFn: () => api.getTrending(timeWindow, 12),
      },
      { queryKey: ["popular", 12], queryFn: () => api.getPopular(1, 12) },
      { queryKey: ["genres"], queryFn: api.getGenres, staleTime: 24 * 60 * 60 * 1000 },
    ],
  });

  if (trendingQuery.isPending && popularQuery.isPending) return <PageLoading />;

  if (trendingQuery.isError && popularQuery.isError) {
    return (
      <div className="page-shell py-16">
        <StatePanel
          kind="error"
          title="The projector is offline"
          message="MOVA could not reach the movie service. Check that the API is running and try again."
          actionLabel="Try again"
          onAction={() => {
            trendingQuery.refetch();
            popularQuery.refetch();
          }}
        />
      </div>
    );
  }

  const trending = trendingQuery.data?.data ?? [];
  const popular = popularQuery.data?.data ?? [];

  return (
    <>
      {trending.length ? <FeaturedHero movies={trending} /> : null}
      <div className="page-shell space-y-20 py-16 sm:py-20">
        <section>
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[0.65rem] font-extrabold uppercase tracking-[0.24em] text-accent-bright">
                The current
              </p>
              <h2 className="mt-2 font-display text-2xl font-bold tracking-tight sm:text-3xl">
                Trending now
              </h2>
            </div>
            <fieldset className="flex rounded-full border border-line bg-page-raised p-1">
              <legend className="sr-only">Trending time window</legend>
              {(["day", "week"] as const).map((value) => (
                <button
                  className={`rounded-full px-4 py-2 text-xs font-bold transition ${
                    timeWindow === value ? "bg-accent text-white" : "text-muted hover:text-ink"
                  }`}
                  key={value}
                  type="button"
                  aria-pressed={timeWindow === value}
                  onClick={() => setTimeWindow(value)}
                >
                  {value === "day" ? "Today" : "This week"}
                </button>
              ))}
            </fieldset>
          </div>
          {trendingQuery.isError ? (
            <StatePanel
              kind="error"
              title="Trending titles are unavailable"
              message="The rest of the archive is still open. Try this section again."
              actionLabel="Retry"
              onAction={() => trendingQuery.refetch()}
            />
          ) : (
            <div className="hide-scrollbar -mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-3 md:-mx-8 md:px-8 xl:mx-0 xl:px-0">
              {trending.map((movie, index) => (
                <Link
                  className="group relative w-[14rem] shrink-0 snap-start overflow-hidden rounded-xl border border-line bg-surface sm:w-[18rem]"
                  key={movie.id}
                  to={`/movies/${movie.id}`}
                >
                  <div className="absolute right-3 top-2 z-10 font-display text-5xl font-black text-white/15">
                    {String(index + 1).padStart(2, "0")}
                  </div>
                  <div className="p-5 pt-16">
                    <h3 className="line-clamp-2 font-display text-xl font-bold text-ink group-hover:text-accent-bright">
                      {movie.title}
                    </h3>
                    <p className="mt-3 line-clamp-3 text-xs leading-5 text-muted">
                      {movie.overview}
                    </p>
                  </div>
                  <div className="h-1 origin-left scale-x-0 bg-accent-bright transition-transform duration-300 group-hover:scale-x-100" />
                </Link>
              ))}
            </div>
          )}
        </section>

        {popular.length ? (
          <MovieRail
            eyebrow="Audience favorites"
            title="Popular in the archive"
            movies={popular}
            action={{ label: "View all", to: "/movies" }}
          />
        ) : null}

        {genresQuery.data?.length ? (
          <section className="rounded-2xl border border-line bg-[linear-gradient(120deg,var(--surface),color-mix(in_srgb,var(--base)_22%,var(--page-raised)))] p-6 sm:p-9">
            <p className="text-[0.65rem] font-extrabold uppercase tracking-[0.24em] text-accent-bright">
              Pick a frequency
            </p>
            <div className="mt-5 flex flex-wrap gap-2.5">
              {genresQuery.data.map((genre) => (
                <Link
                  className="rounded-full border border-line bg-page/25 px-4 py-2 text-sm font-semibold text-muted transition hover:border-accent-bright hover:text-ink"
                  key={genre.id}
                  to={`/movies?genre=${genre.id}`}
                >
                  {genre.name}
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </>
  );
}
