"use client";

import { useEffect, useState } from "react";
import { Clock3, TicketPercent } from "lucide-react";

export type FlashSaleBannerData = {
  code: string;
  label: string;
  headline: string;
  discountText: string;
  endsAt: string;
  serverNow: string;
};

export function FlashSaleBanner({
  flashSale,
}: {
  flashSale: FlashSaleBannerData | null;
}) {
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  useEffect(() => {
    if (!flashSale) return;
    const offset = new Date(flashSale.serverNow).getTime() - Date.now();
    const update = () =>
      setRemainingSeconds(secondsLeft(flashSale.endsAt, offset));
    const initial = window.setTimeout(update, 0);
    const interval = window.setInterval(update, 1000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(interval);
    };
  }, [flashSale]);

  if (!flashSale || remainingSeconds <= 0) return null;

  return (
    <section className="border-y border-secondary/35 bg-[linear-gradient(90deg,rgba(124,58,237,0.2),rgba(168,85,247,0.14),rgba(6,182,212,0.12))]">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-4 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-md bg-gradient-accent text-cta-foreground shadow-[0_0_24px_rgba(168,85,247,0.4)]">
            <TicketPercent className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
              {flashSale.label}
            </p>
            <h2 className="truncate text-base font-semibold text-foreground">
              {flashSale.headline}
            </h2>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="premium-chip px-2.5 py-1 font-mono text-xs font-semibold text-foreground">
            {flashSale.code}
          </span>
          <span className="inline-flex h-9 items-center gap-2 rounded-md bg-background/78 px-3 font-mono text-sm font-semibold text-secondary shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]">
            <Clock3 className="size-4" aria-hidden="true" />
            Ends in {formatCountdown(remainingSeconds)}
          </span>
        </div>
      </div>
    </section>
  );
}

function secondsLeft(endsAt: string, offset: number) {
  return Math.max(
    0,
    Math.ceil((new Date(endsAt).getTime() - (Date.now() + offset)) / 1000),
  );
}

function formatCountdown(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}
