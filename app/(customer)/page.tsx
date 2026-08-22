import {
  CardHover,
  ScrollReveal,
  SkeletonLoading,
  SuccessAnimation,
} from "@/components/motion";

const discoveryLanes = [
  "Movies",
  "Concerts",
  "Comedy",
  "Theatre",
  "Sports",
  "Gaming",
];

export default function CustomerHomePage() {
  return (
    <main className="bg-background text-foreground">
      <section className="border-b border-border bg-primary text-primary-foreground">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-accent">
              Show Time
            </p>
            <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight sm:text-5xl">
              Find the night worth stepping out for.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-primary-foreground/72">
              Movies, live events, games, workshops, and local experiences in a
              calmer ticketing space built for fast choices and secure booking.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {discoveryLanes.map((lane) => (
              <CardHover
                key={lane}
                className="rounded-md border border-primary-foreground/12 bg-primary-foreground/8 p-4"
              >
                <p className="text-sm font-medium text-primary-foreground/70">
                  Explore
                </p>
                <h2 className="mt-3 text-2xl font-semibold">{lane}</h2>
              </CardHover>
            ))}
          </div>
        </div>
      </section>

      <ScrollReveal className="mx-auto grid max-w-7xl gap-8 px-6 py-12 md:grid-cols-3">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted">
            This week
          </p>
          <h2 className="mt-3 text-3xl font-semibold">
            Fresh picks are warming up
          </h2>
        </div>
        <div className="rounded-md border border-border bg-surface p-5">
          <SkeletonLoading className="h-3 w-24" />
          <SkeletonLoading className="mt-4 h-24 w-full" />
          <p className="mt-4 text-sm leading-6 text-muted">
            Curated shows and city drops will appear here as the catalog opens.
          </p>
        </div>
        <div className="flex items-center gap-4 rounded-md border border-border bg-surface p-5">
          <SuccessAnimation />
          <div>
            <h2 className="text-lg font-semibold">You&apos;re all set</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              Clear confirmations for the moments that matter.
            </p>
          </div>
        </div>
      </ScrollReveal>
    </main>
  );
}
