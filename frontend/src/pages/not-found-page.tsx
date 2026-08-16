import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="page-shell grid min-h-[65vh] place-items-center py-16 text-center">
      <div>
        <p className="font-display text-8xl font-black text-base/55 sm:text-9xl">404</p>
        <p className="mt-3 text-[0.65rem] font-extrabold uppercase tracking-[0.24em] text-accent-bright">
          End of reel
        </p>
        <h1 className="mt-3 font-display text-3xl font-extrabold sm:text-4xl">
          This scene is missing
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted">
          The page you requested is not part of this cut.
        </p>
        <Link
          className="mt-7 inline-flex rounded-full bg-accent px-6 py-3 text-sm font-extrabold text-white hover:bg-accent-bright hover:text-page"
          to="/"
        >
          Return to discovery
        </Link>
      </div>
    </div>
  );
}
