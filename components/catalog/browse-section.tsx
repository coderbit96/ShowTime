import type { ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";

type BrowseSectionProps = {
  id: string;
  title: string;
  description?: string;
  children: ReactNode;
};

export function BrowseSection({
  id,
  title,
  description,
  children,
}: BrowseSectionProps) {
  return (
    <section id={id} className="scroll-mt-24 py-9 sm:py-12">
      <div className="mb-6 flex items-end justify-between gap-5">
        <div>
          <p className="mb-2 h-1 w-12 rounded-full bg-[linear-gradient(90deg,var(--secondary),var(--accent))]" />
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {title}
          </h2>
          {description ? (
            <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
          ) : null}
        </div>
        <button
          type="button"
          className="premium-button-secondary hidden h-10 shrink-0 gap-1 px-3 text-sm font-semibold sm:inline-flex"
        >
          See all
          <ArrowUpRight className="size-4" aria-hidden="true" />
        </button>
      </div>
      {children}
    </section>
  );
}
