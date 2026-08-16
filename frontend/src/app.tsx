import { lazy, Suspense, useEffect } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { AppShell } from "./components/app-shell";
import { MovieDetailLoading, PageLoading } from "./components/loading";

const HomePage = lazy(() => import("./pages/home-page"));
const MoviesPage = lazy(() => import("./pages/movies-page"));
const SearchPage = lazy(() => import("./pages/search-page"));
const MovieDetailPage = lazy(() => import("./pages/movie-detail-page"));
const NotFoundPage = lazy(() => import("./pages/not-found-page"));
const MOVIE_DETAIL_PATH = /^\/movies\/[^/]+\/?$/;

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    if (pathname) window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);
  return null;
}

export function App() {
  const { pathname } = useLocation();

  return (
    <>
      <ScrollToTop />
      <Suspense
        fallback={MOVIE_DETAIL_PATH.test(pathname) ? <MovieDetailLoading /> : <PageLoading />}
      >
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<HomePage />} />
            <Route path="movies" element={<MoviesPage />} />
            <Route path="movies/:movieId" element={<MovieDetailPage />} />
            <Route path="search" element={<SearchPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </Suspense>
    </>
  );
}
