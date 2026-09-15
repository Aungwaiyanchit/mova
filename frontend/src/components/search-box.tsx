import { Search } from "lucide-react";
import { type FormEvent, useRef } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";

export function SearchBox({ compact = false }: { compact?: boolean }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);
  const currentQuery = location.pathname === "/search" ? searchParams.get("q") || "" : "";

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = inputRef.current?.value.trim();
    if (!query) {
      inputRef.current?.focus();
      return;
    }
    navigate(`/search?q=${encodeURIComponent(query)}`);
  }

  return (
    <form className={`relative ${compact ? "w-full" : "w-full max-w-sm"}`} onSubmit={submit}>
      <Search
        className="pointer-events-none absolute left-3.5 top-1/2 size-[17px] -translate-y-1/2 text-faint"
        aria-hidden="true"
      />
      <input
        className="h-10 w-full rounded-full border border-line bg-page/65 pl-10 pr-4 text-sm text-ink placeholder:text-faint transition focus:border-accent focus:bg-page"
        defaultValue={currentQuery}
        key={currentQuery}
        ref={inputRef}
        type="search"
        name="q"
        maxLength={200}
        placeholder="Search a title"
        aria-label="Search movies"
      />
    </form>
  );
}
