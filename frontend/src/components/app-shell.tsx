import { Outlet } from "react-router-dom";
import { Header } from "./header";
import { Logo } from "./logo";

export function AppShell() {
  return (
    <div className="min-h-screen">
      <a
        className="absolute left-4 top-4 z-50 -translate-y-20 rounded-full bg-accent px-4 py-2 text-sm font-bold text-white focus:translate-y-0"
        href="#main-content"
      >
        Skip to content
      </a>
      <Header />
      <main id="main-content">
        <Outlet />
      </main>
      <footer className="mt-24 border-t border-line py-10">
        <div className="page-shell flex flex-col gap-5 text-sm text-faint sm:flex-row sm:items-center sm:justify-between">
          <Logo />
          <p className="max-w-md sm:text-right">
            This product uses the TMDB API but is not endorsed or certified by{" "}
            <a
              className="font-semibold text-muted underline decoration-line underline-offset-4 hover:text-ink"
              href="https://www.themoviedb.org"
              rel="noreferrer"
              target="_blank"
            >
              TMDB
            </a>
            .
          </p>
        </div>
      </footer>
    </div>
  );
}
