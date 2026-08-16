import { Outlet } from "react-router-dom";
import { Header } from "./header";
import { Logo } from "./logo";

export function AppShell() {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <Outlet />
      </main>
      <footer className="mt-24 border-t border-line py-10">
        <div className="page-shell flex flex-col gap-5 text-sm text-faint sm:flex-row sm:items-center sm:justify-between">
          <Logo />
          <p>Movie data and artwork provided by TMDB.</p>
        </div>
      </footer>
    </div>
  );
}
