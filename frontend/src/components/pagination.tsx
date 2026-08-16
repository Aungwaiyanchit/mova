import { ChevronLeft, ChevronRight } from "lucide-react";

const PROVIDER_RESULT_LIMIT = 10_000;

export function accessiblePageCount(totalPages: number, pageSize: number) {
  return Math.min(totalPages, Math.ceil(PROVIDER_RESULT_LIMIT / pageSize));
}

function visiblePages(current: number, total: number) {
  const pages = new Set([1, total, current - 1, current, current + 1]);
  return [...pages].filter((page) => page > 0 && page <= total).sort((a, b) => a - b);
}

export function Pagination({
  page,
  totalPages,
  pageSize,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) {
  const accessibleTotal = accessiblePageCount(totalPages, pageSize);
  if (accessibleTotal <= 1) return null;
  const pages = visiblePages(page, accessibleTotal);

  return (
    <nav className="mt-12 flex items-center justify-center gap-2" aria-label="Results pages">
      <button
        className="grid size-10 place-items-center rounded-full border border-line text-muted transition hover:border-accent hover:text-ink disabled:cursor-not-allowed disabled:opacity-30"
        type="button"
        disabled={page <= 1}
        aria-label="Previous page"
        onClick={() => onPageChange(page - 1)}
      >
        <ChevronLeft className="size-4" />
      </button>
      {pages.map((value, index) => {
        const previous = pages[index - 1];
        return (
          <span className="contents" key={value}>
            {previous && value - previous > 1 ? <span className="px-1 text-faint">…</span> : null}
            <button
              className={`size-10 rounded-full text-sm font-bold transition ${
                value === page
                  ? "bg-accent text-white"
                  : "border border-line text-muted hover:border-accent hover:text-ink"
              }`}
              type="button"
              aria-current={value === page ? "page" : undefined}
              onClick={() => onPageChange(value)}
            >
              {value}
            </button>
          </span>
        );
      })}
      <button
        className="grid size-10 place-items-center rounded-full border border-line text-muted transition hover:border-accent hover:text-ink disabled:cursor-not-allowed disabled:opacity-30"
        type="button"
        disabled={page >= accessibleTotal}
        aria-label="Next page"
        onClick={() => onPageChange(page + 1)}
      >
        <ChevronRight className="size-4" />
      </button>
    </nav>
  );
}
