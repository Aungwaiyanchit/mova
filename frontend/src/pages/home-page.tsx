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
          title="Movies are unavailable"
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
      {trendingQuery.isError ? (
        <div className="page-shell py-16">
          <StatePanel
            kind="error"
            title="Trending titles are unavailable"
            message="The rest of the catalog is still open. Try this section again."
            actionLabel="Retry"
            onAction={() => trendingQuery.refetch()}
          />
        </div>
      ) : trending.length ? (
        <FeaturedHero
          key={timeWindow}
          movies={trending}
          timeWindow={timeWindow}
          onTimeWindowChange={setTimeWindow}
        />
      ) : null}
      <div className="page-shell space-y-20 py-16 sm:py-20">
        {popular.length ? (
          <MovieRail
            eyebrow="Audience favorites"
            title="Popular in the catalog"
            movies={popular}
            action={{ label: "View all", to: "/movies" }}
          />
        ) : null}

        {genresQuery.data?.length ? (
          <section className="rounded-2xl border border-line bg-[linear-gradient(120deg,var(--surface),color-mix(in_srgb,var(--tint)_22%,var(--page-raised)))] p-6 sm:p-9">
            <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-accent-bright">
              Browse by genre
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
