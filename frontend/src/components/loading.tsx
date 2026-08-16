export function PageLoading() {
  const placeholders = [
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
  return (
    <div className="page-shell py-12" role="status" aria-label="Loading movies">
      <div className="h-5 w-28 animate-pulse rounded bg-surface" />
      <div className="mt-4 h-10 w-80 max-w-full animate-pulse rounded bg-surface" />
      <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {placeholders.map((placeholder) => (
          <div key={placeholder}>
            <div className="aspect-[2/3] animate-pulse rounded-lg bg-surface" />
            <div className="mt-3 h-4 w-4/5 animate-pulse rounded bg-surface" />
          </div>
        ))}
      </div>
    </div>
  );
}
