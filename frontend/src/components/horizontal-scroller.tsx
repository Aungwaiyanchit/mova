import { ChevronLeft, ChevronRight } from "lucide-react";
import { type ReactNode, useLayoutEffect, useRef, useState } from "react";

export function HorizontalScroller({ children }: { children: ReactNode }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canBack, setCanBack] = useState(false);
  const [canForward, setCanForward] = useState(false);

  useLayoutEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    function update() {
      setCanBack(el.scrollLeft > 8);
      setCanForward(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
    }

    update();
    el.addEventListener("scroll", update, { passive: true });
    const resize = new ResizeObserver(update);
    resize.observe(el);
    const mutation = new MutationObserver(update);
    mutation.observe(el, { childList: true, subtree: true });
    return () => {
      el.removeEventListener("scroll", update);
      resize.disconnect();
      mutation.disconnect();
    };
  }, []);

  function scroll(direction: -1 | 1) {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * Math.min(el.clientWidth * 0.8, 480), behavior: "smooth" });
  }

  return (
    <div className="relative">
      {canBack ? (
        <button
          className="absolute left-0 top-24 z-10 hidden size-10 -translate-x-1/2 place-items-center rounded-full border border-line bg-page-raised text-ink shadow-lg md:grid"
          type="button"
          aria-label="Scroll left"
          onClick={() => scroll(-1)}
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
        </button>
      ) : null}
      {canForward ? (
        <button
          className="absolute right-0 top-24 z-10 hidden size-10 translate-x-1/2 place-items-center rounded-full border border-line bg-page-raised text-ink shadow-lg md:grid"
          type="button"
          aria-label="Scroll right"
          onClick={() => scroll(1)}
        >
          <ChevronRight className="size-4" aria-hidden="true" />
        </button>
      ) : null}
      <div
        className="hide-scrollbar -mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-3 md:-mx-8 md:px-8 xl:mx-0 xl:px-0"
        ref={scrollerRef}
      >
        {children}
      </div>
    </div>
  );
}
