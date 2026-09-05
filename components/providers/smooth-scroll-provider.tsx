"use client";

import { gsap } from "gsap";
import Lenis from "lenis";
import { ArrowUp } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

export function SmoothScrollProvider({ children }: { children: ReactNode }) {
  const lenisRef = useRef<Lenis | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const updatePresentation = (scroll: number, limit: number) => {
      const progress = limit > 0 ? Math.min(scroll / limit, 1) : 0;
      if (progressRef.current)
        progressRef.current.style.transform = `scaleX(${progress})`;
      setShowBackToTop((visible) => {
        const nextVisible = scroll > 560;
        return visible === nextVisible ? visible : nextVisible;
      });
    };

    if (reducedMotion.matches) {
      const handleNativeScroll = () =>
        updatePresentation(
          window.scrollY,
          document.documentElement.scrollHeight - window.innerHeight,
        );
      handleNativeScroll();
      window.addEventListener("scroll", handleNativeScroll, { passive: true });
      return () => window.removeEventListener("scroll", handleNativeScroll);
    }

    const lenis = new Lenis({
      autoRaf: false,
      anchors: true,
      duration: 1.05,
      lerp: 0.09,
      smoothWheel: true,
      syncTouch: false,
    });
    lenisRef.current = lenis;
    lenis.on("scroll", ({ scroll, limit }) => updatePresentation(scroll, limit));
    const updateLenis = (time: number) => lenis.raf(time * 1000);

    gsap.ticker.add(updateLenis);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(updateLenis);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  const scrollToTop = () => {
    if (lenisRef.current) {
      lenisRef.current.scrollTo(0, { duration: 0.85, lock: true });
      return;
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      <div
        className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-1 origin-left bg-[linear-gradient(90deg,var(--primary),var(--secondary),var(--primary))] shadow-[0_2px_12px_rgba(8,134,166,0.28)]"
        ref={progressRef}
        style={{ transform: "scaleX(0)" }}
        aria-hidden="true"
      />
      {children}
      <button
        type="button"
        onClick={scrollToTop}
        className={`fixed bottom-5 right-5 z-40 grid size-11 place-items-center rounded-full border border-primary/30 bg-surface/95 text-primary shadow-[0_14px_32px_rgba(15,23,42,0.16)] backdrop-blur transition duration-300 hover:-translate-y-1 hover:border-secondary/60 hover:bg-secondary hover:text-secondary-foreground hover:shadow-[0_18px_38px_rgba(109,40,217,0.24)] focus-visible:outline-offset-4 sm:bottom-7 sm:right-7 ${showBackToTop ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"}`}
        aria-label="Back to top"
        tabIndex={showBackToTop ? 0 : -1}
      >
        <ArrowUp className="size-4" aria-hidden="true" />
      </button>
    </>
  );
}
