const PAGE_PLACEHOLDERS = [
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
];

const CAST_PLACEHOLDERS = ["one", "two", "three", "four", "five", "six"];

export function PageLoading() {
  return (
    <div className="page-shell py-12" role="status" aria-label="Loading movies">
      <div className="h-5 w-28 animate-pulse rounded bg-surface" />
      <div className="mt-4 h-10 w-80 max-w-full animate-pulse rounded bg-surface" />
      <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {PAGE_PLACEHOLDERS.map((placeholder) => (
          <div key={placeholder}>
            <div className="aspect-[2/3] animate-pulse rounded-lg bg-surface" />
            <div className="mt-3 h-4 w-4/5 animate-pulse rounded bg-surface" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function MovieDetailLoading() {
  return (
    <div role="status" aria-label="Loading movie details">
      <section className="min-h-[43rem] border-b border-line bg-page-raised">
        <div className="page-shell py-8 sm:py-12">
          <div className="h-9 w-24 animate-pulse rounded-full bg-surface" />
          <div className="mt-12 flex max-w-4xl flex-col items-start gap-6 sm:mt-24 sm:flex-row sm:items-end lg:mt-32">
            <div className="aspect-[2/3] w-28 shrink-0 animate-pulse rounded-lg bg-surface sm:w-44 lg:w-52" />
            <div className="w-full pb-2">
              <div className="h-3 w-24 animate-pulse rounded bg-surface" />
              <div className="mt-5 h-12 w-full max-w-xl animate-pulse rounded bg-surface sm:h-16" />
              <div className="mt-5 h-4 w-56 max-w-full animate-pulse rounded bg-surface" />
              <div className="mt-5 flex gap-2">
                <div className="h-7 w-20 animate-pulse rounded-full bg-surface" />
                <div className="h-7 w-24 animate-pulse rounded-full bg-surface" />
              </div>
              <div className="mt-6 space-y-3">
                <div className="h-4 w-full max-w-2xl animate-pulse rounded bg-surface" />
                <div className="h-4 w-11/12 max-w-xl animate-pulse rounded bg-surface" />
                <div className="h-4 w-3/4 max-w-lg animate-pulse rounded bg-surface" />
              </div>
              <div className="mt-7 h-11 w-36 animate-pulse rounded-full bg-surface" />
            </div>
          </div>
        </div>
      </section>

      <div className="page-shell py-16 sm:py-20">
        <div className="h-8 w-28 animate-pulse rounded bg-surface" />
        <div className="hide-scrollbar -mx-4 mt-6 flex gap-4 overflow-hidden px-4 pb-3 md:-mx-8 md:px-8 xl:mx-0 xl:px-0">
          {CAST_PLACEHOLDERS.map((placeholder) => (
            <div className="w-32 shrink-0 sm:w-36" key={placeholder}>
              <div className="aspect-[4/5] animate-pulse rounded-lg bg-surface" />
              <div className="mt-3 h-4 w-4/5 animate-pulse rounded bg-surface" />
              <div className="mt-2 h-3 w-3/5 animate-pulse rounded bg-surface" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
