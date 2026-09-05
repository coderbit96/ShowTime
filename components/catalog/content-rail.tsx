"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

type ContentRailProps = {
  children: ReactNode;
};

export function ContentRail({ children }: ContentRailProps) {
  const railRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  function updateScrollState() {
    const rail = railRef.current;

    if (!rail) return;

    const remaining = rail.scrollWidth - rail.clientWidth - rail.scrollLeft;
    setCanScrollLeft(rail.scrollLeft > 4);
    setCanScrollRight(remaining > 4);
  }

  useEffect(() => {
    const rail = railRef.current;

    if (!rail) return;

    updateScrollState();

    const observer = new ResizeObserver(updateScrollState);
    observer.observe(rail);

    return () => observer.disconnect();
  }, []);

  function move(direction: -1 | 1) {
    const rail = railRef.current;

    if (!rail) return;

    rail.scrollBy({
      left: direction * Math.max(280, rail.clientWidth * 0.78),
      behavior: "smooth",
    });
  }

  return (
    <div className="group/rail relative">
      <div
        ref={railRef}
        onScroll={updateScrollState}
        className="flex items-stretch snap-x snap-mandatory gap-5 overflow-x-auto pb-5 pr-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>
      <div
        className={`pointer-events-none absolute inset-y-0 -left-14 z-10 items-center bg-gradient-to-r from-background via-background/82 to-transparent pl-2 pr-12 ${canScrollLeft ? "hidden lg:flex" : "hidden"}`}
      >
        <button
          type="button"
          onClick={() => move(-1)}
          disabled={!canScrollLeft}
          className="pointer-events-auto grid size-11 place-items-center rounded-xl border border-secondary/35 bg-background/90 text-foreground shadow-[0_10px_26px_rgba(15,23,42,0.12)] backdrop-blur-md transition duration-200 hover:-translate-y-0.5 hover:border-secondary/80 hover:bg-secondary/14 hover:text-secondary hover:shadow-[0_14px_30px_rgba(6,182,212,0.16)] focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:border-border disabled:bg-background/70 disabled:text-muted disabled:opacity-45 disabled:shadow-none disabled:hover:translate-y-0 disabled:hover:border-border disabled:hover:bg-background/70"
          aria-label="Scroll left"
          title="Scroll left"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
        </button>
      </div>
      <div
        className={`pointer-events-none absolute inset-y-0 -right-14 z-10 items-center bg-gradient-to-l from-background via-background/82 to-transparent pl-12 pr-2 ${canScrollRight ? "hidden lg:flex" : "hidden"}`}
      >
        <button
          type="button"
          onClick={() => move(1)}
          disabled={!canScrollRight}
          className="pointer-events-auto grid size-11 place-items-center rounded-xl bg-[linear-gradient(135deg,rgba(124,58,237,0.98),rgba(168,85,247,0.98))] text-cta-foreground shadow-[0_10px_26px_rgba(124,58,237,0.4)] transition duration-200 hover:-translate-y-0.5 hover:scale-[1.04] hover:shadow-[0_16px_34px_rgba(168,85,247,0.34)] focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-muted disabled:opacity-45 disabled:shadow-none disabled:hover:translate-y-0 disabled:hover:scale-100"
          aria-label="Scroll right"
          title="Scroll right"
        >
          <ChevronRight className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
