import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ImageOff, Play, Star, Users } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { HorizontalScroller } from "../components/horizontal-scroller";
import { MovieDetailLoading } from "../components/loading";
import { MovieRail } from "../components/movie-rail";
import { SourceDialog } from "../components/source-dialog";
import { StatePanel } from "../components/state-panel";
import { ApiError, api } from "../lib/api";
import { formatRuntime, formatVotes, movieYear } from "../lib/format";

export default function MovieDetailPage() {
  const navigate = useNavigate();
  const { movieId } = useParams();
  const parsedMovieId = Number(movieId);
  const validMovieId = Number.isInteger(parsedMovieId) && parsedMovieId > 0;
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const movieQuery = useQuery({
    queryKey: ["movie", parsedMovieId],
    queryFn: () => api.getMovie(parsedMovieId),
    enabled: validMovieId,
  });

  function goBack() {
    if (typeof window.history.state?.idx === "number" && window.history.state.idx > 0) {
      navigate(-1);
      return;
    }
    navigate("/movies");
  }

  if (!validMovieId) {
    return (
      <div className="page-shell py-16">
        <StatePanel title="That title does not exist" message="The movie address is not valid." />
      </div>
    );
  }

  if (movieQuery.isPending) return <MovieDetailLoading />;

  if (movieQuery.isError) {
    const notFound = movieQuery.error instanceof ApiError && movieQuery.error.status === 404;
    return (
      <div className="page-shell py-16">
        <StatePanel
          kind={notFound ? "empty" : "error"}
          title={notFound ? "That film left the archive" : "This film would not load"}
          message={
            notFound
              ? "The requested title could not be found."
              : "MOVA could not retrieve this movie’s details."
          }
          actionLabel={notFound ? "Browse movies" : "Try again"}
          onAction={() => (notFound ? navigate("/movies") : movieQuery.refetch())}
        />
      </div>
    );
  }

  const movie = movieQuery.data;
  const runtime = formatRuntime(movie.runtime);

  return (
    <>
      <section className="relative min-h-[43rem] overflow-hidden border-b border-line bg-page-raised">
        {movie.backdrop ? (
          <img
            className="absolute inset-0 size-full object-cover opacity-50"
            src={movie.backdrop}
            alt=""
          />
        ) : null}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,var(--page)_0%,color-mix(in_srgb,var(--page)_78%,transparent)_45%,color-mix(in_srgb,var(--page)_20%,transparent)),linear-gradient(0deg,var(--page)_0%,transparent_70%)]" />
        <div className="page-shell relative py-8 sm:py-12">
          <button
            className="inline-flex items-center gap-2 rounded-full border border-line bg-page/50 px-4 py-2 text-xs font-bold text-muted backdrop-blur transition hover:border-accent hover:text-ink"
            type="button"
            onClick={goBack}
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back
          </button>
          <div className="mt-12 flex max-w-4xl flex-col items-start gap-6 sm:mt-24 sm:flex-row sm:items-end lg:mt-32">
            <div className="w-28 shrink-0 overflow-hidden rounded-lg border border-line bg-surface shadow-2xl sm:w-44 lg:w-52">
              {movie.poster ? (
                <img
                  className="aspect-[2/3] size-full object-cover"
                  src={movie.poster}
                  alt={`Poster for ${movie.title}`}
                />
              ) : (
                <div className="grid aspect-[2/3] place-items-center text-faint">
                  <ImageOff className="size-8" />
                </div>
              )}
            </div>
            <div className="pb-2">
              <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-accent-bright">
                Now showing
              </p>
              <h1 className="mt-3 line-clamp-3 font-display text-4xl font-extrabold leading-[0.96] tracking-[-0.045em] sm:text-6xl lg:text-7xl">
                {movie.title}
              </h1>
              {movie.original_title !== movie.title ? (
                <p className="mt-2 text-sm text-faint">Originally “{movie.original_title}”</p>
              ) : null}
              <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-bold uppercase tracking-wider text-muted">
                <span className="flex items-center gap-1.5 text-ink">
                  <Star className="size-4 fill-accent-bright text-accent-bright" />
                  {movie.vote_average.toFixed(1)}
                  <span className="font-medium text-faint">({formatVotes(movie.vote_count)})</span>
                </span>
                <span>{movieYear(movie.release_date)}</span>
                {runtime ? <span>{runtime}</span> : null}
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                {movie.genres.map((genre) => (
                  <Link
                    className="rounded-full border border-line bg-page/35 px-3 py-1.5 text-xs font-semibold text-muted backdrop-blur hover:border-accent-bright hover:text-ink"
                    key={genre.id}
                    to={`/movies?genre=${genre.id}`}
                  >
                    {genre.name}
                  </Link>
                ))}
              </div>
              <p className="mt-6 max-w-2xl text-sm leading-7 text-muted sm:text-base">
                {movie.overview}
              </p>
              <button
                className="mt-7 inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-extrabold text-white transition hover:bg-accent-bright hover:text-page"
                type="button"
                onClick={() => setSourcesOpen(true)}
              >
                <Play className="size-4 fill-current" />
                Play
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="page-shell space-y-20 py-16 sm:py-20">
        <section>
          <div className="mb-6 flex items-center gap-3">
            <Users className="size-5 text-accent-bright" aria-hidden="true" />
            <h2 className="font-display text-2xl font-bold sm:text-3xl">Cast</h2>
          </div>
          {movie.cast.length ? (
            <HorizontalScroller>
              {movie.cast.slice(0, 18).map((member) => (
                <article
                  className="w-32 shrink-0 snap-start sm:w-36"
                  key={`${member.id}-${member.order}`}
                >
                  <div className="aspect-[4/5] overflow-hidden rounded-lg bg-surface">
                    {member.profile_image ? (
                      <img
                        className="size-full object-cover"
                        src={member.profile_image}
                        alt={member.name}
                        loading="lazy"
                      />
                    ) : (
                      <div className="grid size-full place-items-center text-faint">
                        <Users className="size-7" />
                      </div>
                    )}
                  </div>
                  <h3 className="mt-3 truncate text-sm font-bold text-ink">{member.name}</h3>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-faint">
                    {member.character}
                  </p>
                </article>
              ))}
            </HorizontalScroller>
          ) : (
            <p className="text-sm text-muted">Cast information is not available for this title.</p>
          )}
        </section>

        {movie.production_companies.length ? (
          <section className="border-y border-line py-8">
            <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-faint">
              A production by
            </p>
            <p className="mt-3 font-display text-xl font-bold text-muted">
              {movie.production_companies.map((company) => company.name).join(" · ")}
            </p>
          </section>
        ) : null}

        {movie.similar_movies.length ? (
          <MovieRail
            eyebrow="Stay for another"
            title="Related films"
            movies={movie.similar_movies}
          />
        ) : null}
      </div>

      <SourceDialog
        key={movie.id}
        movieId={movie.id}
        movieTitle={movie.title}
        poster={movie.backdrop}
        open={sourcesOpen}
        onClose={() => setSourcesOpen(false)}
      />
    </>
  );
}
