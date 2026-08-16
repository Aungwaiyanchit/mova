import type { Movie } from "../types/api";
import { MovieCard } from "./movie-card";

export function MovieGrid({ movies }: { movies: Movie[] }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {movies.map((movie, index) => (
        <MovieCard key={movie.id} movie={movie} priority={index < 5} />
      ))}
    </div>
  );
}
