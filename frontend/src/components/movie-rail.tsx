import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import type { Movie } from "../types/api";
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
          <p className="text-[0.65rem] font-extrabold uppercase tracking-[0.24em] text-accent-bright">
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
      <div className="hide-scrollbar -mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-3 md:-mx-8 md:px-8 xl:mx-0 xl:px-0">
        {movies.map((movie, index) => (
          <div className="w-[9.5rem] shrink-0 snap-start sm:w-[11rem] lg:w-[12rem]" key={movie.id}>
            <MovieCard movie={movie} priority={index < 3} />
          </div>
        ))}
      </div>
    </section>
  );
}
