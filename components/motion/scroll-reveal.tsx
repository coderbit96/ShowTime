"use client";

import { gsap } from "gsap";
import { useEffect, useRef, type ReactNode } from "react";

type ScrollRevealProps = {
  children: ReactNode;
  className?: string;
};

export function ScrollReveal({ children, className }: ScrollRevealProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = containerRef.current;
    if (!element || window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      return;

    const context = gsap.context(() => {
      gsap.set(element, { autoAlpha: 0, y: 20 });
    }, element);
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        gsap.to(element, {
          autoAlpha: 1,
          y: 0,
          duration: 0.62,
          ease: "power3.out",
          overwrite: "auto",
        });
        observer.unobserve(element);
      },
      { rootMargin: "0px 0px -9%" },
    );
    observer.observe(element);

    return () => {
      observer.disconnect();
      context.revert();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={className}
    >
      {children}
    </div>
  );
}
