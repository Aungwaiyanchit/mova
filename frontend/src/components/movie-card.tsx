import { ImageOff, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { imageUrl, movieYear } from "../lib/format";
import type { Movie } from "../types/api";

export function MovieCard({ movie, priority = false }: { movie: Movie; priority?: boolean }) {
  const poster = imageUrl(movie.poster_path, "w342");

  return (
    <Link className="group block min-w-0" to={`/movies/${movie.id}`}>
      <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-surface">
        {poster ? (
          <img
            className="size-full object-cover transition duration-500 group-hover:scale-[1.035] group-hover:opacity-80"
            src={poster}
            alt={`Poster for ${movie.title}`}
            loading={priority ? "eager" : "lazy"}
          />
        ) : (
          <div className="grid size-full place-items-center text-faint">
            <ImageOff className="size-8" aria-hidden="true" />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-page to-transparent opacity-0 transition group-hover:opacity-100" />
        <span className="absolute right-2 top-2 flex items-center gap-1 rounded-md bg-page/85 px-2 py-1 text-xs font-bold text-ink backdrop-blur">
          <Star className="size-3 fill-accent-bright text-accent-bright" aria-hidden="true" />
          {movie.vote_average ? movie.vote_average.toFixed(1) : "NR"}
        </span>
      </div>
      <h3 className="mt-3 truncate font-display text-[0.95rem] font-bold text-ink transition group-hover:text-accent-bright">
        {movie.title}
      </h3>
      <p className="mt-1 text-xs font-semibold tracking-wide text-faint">
        {movieYear(movie.release_date)}
      </p>
    </Link>
  );
}
