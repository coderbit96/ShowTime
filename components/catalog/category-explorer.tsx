"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import {
  Clapperboard,
  Drama,
  Dumbbell,
  Laugh,
  Mic2,
  Palette,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

type Category = {
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
};

const categories: Category[] = [
  {
    label: "Movies",
    description: "Big-screen stories",
    href: "#recommended-movies",
    icon: Clapperboard,
  },
  {
    label: "Live music",
    description: "Concerts & gigs",
    href: "#concerts",
    icon: Mic2,
  },
  {
    label: "Comedy",
    description: "A good laugh",
    href: "#comedy",
    icon: Laugh,
  },
  {
    label: "Sports",
    description: "Feel the roar",
    href: "#sports",
    icon: Dumbbell,
  },
  {
    label: "Theatre",
    description: "Stories on stage",
    href: "#live-events",
    icon: Drama,
  },
  {
    label: "Workshops",
    description: "Make something new",
    href: "#weekend-experiences",
    icon: Palette,
  },
];

export function CategoryExplorer() {
  const railRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail || window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      return;

    let frameId = 0;
    let previousTime = performance.now();
    const scrollSpeed = 24;

    const animate = (currentTime: number) => {
      const elapsed = Math.min(currentTime - previousTime, 80);
      previousTime = currentTime;
      const loopPoint = rail.scrollWidth / 2;

      if (!pausedRef.current && loopPoint > rail.clientWidth) {
        rail.scrollLeft += (elapsed / 1_000) * scrollSpeed;
        if (rail.scrollLeft >= loopPoint) rail.scrollLeft -= loopPoint;
      }
      frameId = window.requestAnimationFrame(animate);
    };

    frameId = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(frameId);
  }, []);

  return (
    <section
      aria-labelledby="explore-by-mood"
      className="mx-auto max-w-7xl px-5 pt-9 sm:px-6 sm:pt-12"
    >
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
            Pick your plan
          </p>
          <h2
            id="explore-by-mood"
            className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl"
          >
            Explore by mood
          </h2>
        </div>
        <p className="inline-flex items-center gap-1.5 text-sm text-muted">
          <Sparkles
            className="size-4 text-gradient-accent"
            aria-hidden="true"
          />
          Curated for Kolkata
        </p>
      </div>
      <div
        ref={railRef}
        onPointerEnter={() => {
          pausedRef.current = true;
        }}
        onPointerLeave={() => {
          pausedRef.current = false;
        }}
        onFocusCapture={() => {
          pausedRef.current = true;
        }}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget))
            pausedRef.current = false;
        }}
        onPointerDown={() => {
          pausedRef.current = true;
        }}
        onPointerUp={() => {
          pausedRef.current = false;
        }}
        className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label="Explore entertainment categories"
      >
        {[...categories, ...categories].map((category, index) => {
          const Icon = category.icon;
          const duplicate = index >= categories.length;
          return (
            <Link
              key={`${category.label}-${index}`}
              href={category.href}
              aria-hidden={duplicate}
              tabIndex={duplicate ? -1 : undefined}
              className="group w-[calc(50%-0.375rem)] shrink-0 rounded-2xl border border-border bg-surface p-4 shadow-[0_12px_32px_rgba(15,23,42,0.08)] transition duration-200 hover:-translate-y-1 hover:border-primary/60 hover:bg-elevated sm:w-[224px] lg:w-[236px]"
            >
              <span className="grid size-10 place-items-center rounded-xl bg-primary/12 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <span className="mt-4 block text-sm font-semibold text-foreground">
                {category.label}
              </span>
              <span className="mt-1 block text-xs leading-5 text-muted">
                {category.description}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
