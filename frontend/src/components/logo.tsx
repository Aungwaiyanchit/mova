import { Link } from "react-router-dom";

export function Logo() {
  return (
    <Link className="group flex shrink-0 items-center gap-2.5" to="/" aria-label="MOVA home">
      <span className="relative grid size-8 place-items-center overflow-hidden rounded-sm bg-accent text-page">
        <span className="absolute inset-y-0 left-1/2 w-px -rotate-12 bg-page/25" />
        <span className="font-display text-lg font-extrabold">M</span>
      </span>
      <span className="hidden font-display text-xl font-extrabold tracking-[0.16em] text-ink min-[400px]:inline">
        MOVA
      </span>
    </Link>
  );
}
