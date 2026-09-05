"use client";

import { gsap } from "gsap";
import {
  useEffect,
  useRef,
  type PointerEvent,
  type ReactNode,
} from "react";

export function Magnetic({
  children,
  className,
  strength = 0.14,
}: {
  children: ReactNode;
  className?: string;
  strength?: number;
}) {
  const elementRef = useRef<HTMLDivElement>(null);
  const enabledRef = useRef(false);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const supportsFinePointer = window.matchMedia("(pointer: fine)");
    const updateEnabled = () => {
      enabledRef.current = !reducedMotion.matches && supportsFinePointer.matches;
    };
    updateEnabled();
    reducedMotion.addEventListener("change", updateEnabled);
    supportsFinePointer.addEventListener("change", updateEnabled);
    return () => {
      reducedMotion.removeEventListener("change", updateEnabled);
      supportsFinePointer.removeEventListener("change", updateEnabled);
    };
  }, []);

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const element = elementRef.current;
    if (!element || !enabledRef.current) return;
    const bounds = element.getBoundingClientRect();
    const x = (event.clientX - bounds.left - bounds.width / 2) * strength;
    const y = (event.clientY - bounds.top - bounds.height / 2) * strength;
    gsap.to(element, { x, y, duration: 0.38, ease: "power3.out", overwrite: "auto" });
  };

  const handlePointerLeave = () => {
    const element = elementRef.current;
    if (!element || !enabledRef.current) return;
    gsap.to(element, { x: 0, y: 0, duration: 0.52, ease: "elastic.out(1, 0.42)", overwrite: "auto" });
  };

  return (
    <div
      ref={elementRef}
      className={className}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      {children}
    </div>
  );
}
