import { ArrowRight, CalendarDays, Play, Star } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { imageUrl, movieYear } from "../lib/format";
import type { Movie } from "../types/api";

export function FeaturedHero({ movies }: { movies: Movie[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeMovie = movies[activeIndex] ?? movies[0];
  if (!activeMovie) return null;
  const backdrop = imageUrl(activeMovie.backdrop_path, "w1280");

  return (
    <section className="relative min-h-[39rem] overflow-hidden border-b border-line bg-page-raised lg:min-h-[44rem]">
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

      <div className="page-shell relative flex min-h-[39rem] flex-col justify-end pb-12 pt-24 lg:min-h-[44rem] lg:justify-center lg:pb-20">
        <div className="max-w-2xl">
          <div className="mb-5 flex items-center gap-3">
            <span className="h-px w-9 bg-accent-bright" />
            <span className="text-[0.7rem] font-extrabold uppercase tracking-[0.24em] text-accent-bright">
              This week’s projection
            </span>
          </div>
          <h1 className="font-display text-5xl font-extrabold leading-[0.95] tracking-[-0.045em] text-ink sm:text-6xl lg:text-8xl">
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
          <p className="mt-5 max-w-xl text-sm leading-7 text-muted sm:text-base">
            {activeMovie.overview || "Details for this title are still under wraps."}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-extrabold text-white transition hover:bg-accent-bright hover:text-page"
              to={`/movies/${activeMovie.id}`}
            >
              <Play className="size-4 fill-current" aria-hidden="true" />
              Explore film
            </Link>
            <Link
              className="inline-flex items-center gap-2 rounded-full border border-line bg-page/40 px-6 py-3 text-sm font-bold text-ink backdrop-blur transition hover:border-accent-bright"
              to="/movies"
            >
              Browse the archive
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </div>

        <div className="mt-12 flex max-w-2xl items-end gap-2 lg:absolute lg:bottom-14 lg:right-8 lg:mt-0 lg:w-[31rem]">
          {movies.slice(0, 5).map((movie, index) => (
            <button
              className={`group flex-1 border-t pt-3 text-left transition ${
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
              <span className="block text-[0.6rem] font-extrabold tracking-[0.16em]">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="mt-1 hidden truncate text-xs font-bold sm:block">{movie.title}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
