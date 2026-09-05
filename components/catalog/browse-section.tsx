import type { ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

type BrowseSectionProps = {
  id: string;
  title: string;
  description?: string;
  href?: string;
  children: ReactNode;
};

export function BrowseSection({
  id,
  title,
  description,
  href = "/search",
  children,
}: BrowseSectionProps) {
  return (
    <section id={id} className="scroll-mt-24 py-10 sm:py-14">
      <div className="relative mb-6 text-center">
        <div>
          <p className="mx-auto mb-3 h-1 w-12 rounded-full bg-[linear-gradient(90deg,var(--primary),var(--gradient-accent))]" />
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {title}
          </h2>
          {description ? (
            <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
          ) : null}
        </div>
        <Link
          href={href}
          aria-label={`See all ${title}`}
          className="premium-button-secondary absolute bottom-0 right-0 hidden h-10 gap-1 px-3 text-sm font-semibold sm:inline-flex"
        >
          See all
          <ArrowUpRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
      {children}
    </section>
  );
}
