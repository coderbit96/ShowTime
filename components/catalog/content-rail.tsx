"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef, type ReactNode } from "react";

type ContentRailProps = {
  children: ReactNode;
};

export function ContentRail({ children }: ContentRailProps) {
  const railRef = useRef<HTMLDivElement>(null);

  function move(direction: -1 | 1) {
    railRef.current?.scrollBy({
      left: direction * Math.max(280, railRef.current.clientWidth * 0.78),
      behavior: "smooth",
    });
  }

  return (
    <div className="group/rail relative">
      <div
        ref={railRef}
        className="flex snap-x snap-mandatory gap-5 overflow-x-auto pb-5 pr-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>
      <div className="pointer-events-none absolute inset-y-0 right-0 hidden items-center gap-2 bg-gradient-to-l from-background via-background/70 to-transparent pl-14 lg:flex">
        <button
          type="button"
          onClick={() => move(-1)}
          className="premium-button-secondary pointer-events-auto grid size-10 place-items-center opacity-0 group-hover/rail:opacity-100"
          aria-label="Scroll left"
          title="Scroll left"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => move(1)}
          className="premium-button pointer-events-auto grid size-10 place-items-center opacity-0 group-hover/rail:opacity-100"
          aria-label="Scroll right"
          title="Scroll right"
        >
          <ChevronRight className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
