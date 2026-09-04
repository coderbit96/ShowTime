import Link from "next/link";

type InfoPageProps = {
  title: string;
  eyebrow: string;
  description: string;
  sections: Array<{ title: string; body: string }>;
};

export function InfoPage({
  title,
  eyebrow,
  description,
  sections,
}: InfoPageProps) {
  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:py-16">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-secondary">
        {eyebrow}
      </p>
      <h1 className="mt-3 text-4xl font-semibold text-foreground sm:text-5xl">
        {title}
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-7 text-muted">
        {description}
      </p>
      <div className="mt-10 grid gap-4 md:grid-cols-2">
        {sections.map((section) => (
          <section
            key={section.title}
            className="rounded-md border border-border bg-surface p-5"
          >
            <h2 className="text-lg font-semibold text-foreground">
              {section.title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted">{section.body}</p>
          </section>
        ))}
      </div>
      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href="/search"
          className="inline-flex h-11 items-center rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
        >
          Explore shows
        </Link>
        <Link
          href="/auth/register"
          className="inline-flex h-11 items-center rounded-md border border-border bg-surface px-5 text-sm font-semibold text-foreground transition-colors hover:bg-surface-muted"
        >
          Create account
        </Link>
      </div>
    </main>
  );
}
