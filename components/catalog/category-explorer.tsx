import Link from "next/link";
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
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {categories.map((category) => {
          const Icon = category.icon;
          return (
            <Link
              key={category.label}
              href={category.href}
              className="group rounded-2xl border border-border bg-surface p-4 shadow-[0_12px_32px_rgba(0,0,0,0.16)] transition duration-200 hover:-translate-y-1 hover:border-primary/60 hover:bg-elevated"
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
