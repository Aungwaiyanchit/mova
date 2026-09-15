import { ArrowRight, CalendarDays, Star } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { imageUrl, movieYear } from "../lib/format";
import type { Movie, TimeWindow } from "../types/api";

export function FeaturedHero({
  movies,
  timeWindow,
  onTimeWindowChange,
}: {
  movies: Movie[];
  timeWindow: TimeWindow;
  onTimeWindowChange: (value: TimeWindow) => void;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeMovie = movies[activeIndex] ?? movies[0];
  if (!activeMovie) return null;
  const backdrop = imageUrl(activeMovie.backdrop_path, "w1280");

  return (
    <section className="relative min-h-[28rem] overflow-hidden border-b border-line bg-page-raised sm:min-h-[39rem] lg:min-h-[44rem]">
      {backdrop ? (
        <img
          className="absolute inset-0 size-full object-cover object-center opacity-60"
          src={backdrop}
          alt=""
          fetchPriority="high"
        />
      ) : null}
      <div className="absolute inset-0 bg-[linear-gradient(90deg,var(--page)_0%,color-mix(in_srgb,var(--page)_82%,transparent)_38%,color-mix(in_srgb,var(--page)_25%,transparent)_75%),linear-gradient(0deg,var(--page)_0%,transparent_65%)]" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent-bright/70 to-transparent" />

      <div className="page-shell relative flex min-h-[28rem] flex-col justify-end pb-12 pt-16 sm:min-h-[39rem] sm:pt-24 lg:min-h-[44rem] lg:justify-center lg:pb-20">
        <div className="max-w-2xl">
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <span className="h-px w-9 bg-accent-bright" />
            <span className="text-xs font-extrabold uppercase tracking-[0.24em] text-accent-bright">
              {timeWindow === "day" ? "Trending today" : "Trending this week"}
            </span>
            <fieldset className="ml-auto flex rounded-full border border-line bg-page/50 p-1 backdrop-blur">
              <legend className="sr-only">Trending time window</legend>
              {(["day", "week"] as const).map((value) => (
                <button
                  className={`rounded-full px-4 py-2 text-xs font-bold transition ${
                    timeWindow === value ? "bg-accent text-white" : "text-muted hover:text-ink"
                  }`}
                  key={value}
                  type="button"
                  aria-pressed={timeWindow === value}
                  onClick={() => onTimeWindowChange(value)}
                >
                  {value === "day" ? "Today" : "This week"}
                </button>
              ))}
            </fieldset>
          </div>
          <h1 className="line-clamp-3 font-display text-4xl font-extrabold leading-[0.95] tracking-[-0.045em] text-ink sm:text-6xl lg:text-8xl">
            {activeMovie.title}
          </h1>
          <div className="mt-6 flex flex-wrap items-center gap-4 text-xs font-bold uppercase tracking-wider text-muted">
            <span className="flex items-center gap-1.5 text-ink">
              <Star className="size-4 fill-accent-bright text-accent-bright" aria-hidden="true" />
              {activeMovie.vote_average ? activeMovie.vote_average.toFixed(1) : "Not rated"}
            </span>
            <span className="flex items-center gap-1.5">
              <CalendarDays className="size-4" aria-hidden="true" />
              {movieYear(activeMovie.release_date)}
            </span>
          </div>
          <p className="mt-5 line-clamp-4 max-w-xl text-sm leading-7 text-muted sm:text-base">
            {activeMovie.overview || "Details for this title are still under wraps."}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-extrabold text-white transition hover:bg-accent-bright hover:text-page"
              to={`/movies/${activeMovie.id}`}
            >
              View details
            </Link>
            <Link
              className="inline-flex items-center gap-2 rounded-full border border-line bg-page/40 px-6 py-3 text-sm font-bold text-ink backdrop-blur transition hover:border-accent-bright"
              to="/movies"
            >
              Browse movies
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </div>

        <div className="mt-12 flex max-w-2xl items-end gap-2 lg:absolute lg:bottom-14 lg:right-8 lg:mt-0 lg:w-[31rem]">
          {movies.slice(0, 5).map((movie, index) => (
            <button
              className={`group min-w-0 flex-1 border-t pt-3 text-left transition ${
                activeMovie.id === movie.id
                  ? "border-accent-bright text-ink"
                  : "border-line text-faint hover:border-muted hover:text-muted"
              }`}
              key={movie.id}
              type="button"
              aria-label={`Feature ${movie.title}`}
              aria-pressed={activeMovie.id === movie.id}
              onClick={() => setActiveIndex(index)}
            >
              <span className="block text-xs font-extrabold tracking-[0.16em]">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="mt-1 block truncate text-xs font-bold">{movie.title}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
