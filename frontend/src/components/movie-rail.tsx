import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import type { Movie } from "../types/api";
import { HorizontalScroller } from "./horizontal-scroller";
import { MovieCard } from "./movie-card";

interface MovieRailProps {
  eyebrow: string;
  title: string;
  movies: Movie[];
  action?: { label: string; to: string };
}

export function MovieRail({ eyebrow, title, movies, action }: MovieRailProps) {
  return (
    <section>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-accent-bright">
            {eyebrow}
          </p>
          <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            {title}
          </h2>
        </div>
        {action ? (
          <Link
            className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted transition hover:text-accent-bright"
            to={action.to}
          >
            {action.label}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        ) : null}
      </div>
      <HorizontalScroller>
        {movies.map((movie, index) => (
          <div className="w-[9.5rem] shrink-0 snap-start sm:w-[11rem] lg:w-[12rem]" key={movie.id}>
            <MovieCard movie={movie} priority={index < 3} />
          </div>
        ))}
      </HorizontalScroller>
    </section>
  );
}
