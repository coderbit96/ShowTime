import Image from "next/image";

export function RouteLoading() {
  return (
    <main
      className="grid min-h-[52vh] place-items-center px-5 py-16"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="w-full max-w-sm text-center">
        <div className="relative mx-auto grid size-20 place-items-center rounded-3xl border border-secondary/25 bg-surface shadow-[0_18px_48px_rgba(109,40,217,0.16)]">
          <span
            className="loading-logo-ring absolute -inset-1 rounded-[1.2rem] border border-primary/35"
            aria-hidden="true"
          />
          <Image
            src="/show-time-logo.svg"
            alt=""
            width={48}
            height={48}
            priority
            className="relative size-12"
          />
        </div>

        <p className="mt-7 text-lg font-semibold tracking-tight text-foreground">
          Finding your next plan
        </p>
        <p className="mt-2 text-sm text-muted">
          Bringing movies, events, and experiences together.
        </p>

        <div className="mt-6 flex justify-center gap-2" aria-hidden="true">
          <span className="loading-dot" />
          <span className="loading-dot loading-dot-delay-1" />
          <span className="loading-dot loading-dot-delay-2" />
        </div>

        <div className="mt-7 h-1.5 overflow-hidden rounded-full bg-surface-muted">
          <span className="loading-progress block h-full rounded-full bg-[linear-gradient(90deg,var(--primary),var(--secondary),var(--primary))]" />
        </div>
        <span className="sr-only">Loading page content</span>
      </div>
    </main>
  );
}
