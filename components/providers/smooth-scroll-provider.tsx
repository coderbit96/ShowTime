"use client";

import { gsap } from "gsap";
import Lenis from "lenis";
import { useEffect, type ReactNode } from "react";

export function SmoothScrollProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    if (reducedMotion.matches) return;

    const lenis = new Lenis({
      autoRaf: false,
      anchors: true,
      duration: 1.05,
      lerp: 0.09,
      smoothWheel: true,
      syncTouch: false,
    });
    const updateLenis = (time: number) => lenis.raf(time * 1000);

    gsap.ticker.add(updateLenis);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(updateLenis);
      lenis.destroy();
    };
  }, []);

  return children;
}
