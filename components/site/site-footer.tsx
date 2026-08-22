import Link from "next/link";
import { NewsletterForm } from "./newsletter-form";

const footerGroups = [
  {
    title: "Explore",
    links: ["Movies", "Concerts", "Sports", "Workshops"],
  },
  {
    title: "Company",
    links: ["About", "Careers", "Press", "Contact"],
  },
  {
    title: "Support",
    links: ["Help Center", "Cancellation", "Gift Cards", "Safety"],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-primary/10 bg-primary text-primary-foreground">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-12 md:grid-cols-[1.1fr_2fr_1.2fr]">
        <div>
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-md bg-accent text-sm font-black text-accent-foreground">
              ST
            </span>
            <span className="text-lg font-semibold">Show Time</span>
          </Link>
          <p className="mt-4 max-w-xs text-sm leading-6 text-primary-foreground/72">
            A quieter, sharper way to discover movies, shows, games, and local
            experiences.
          </p>
        </div>

        <div className="grid gap-8 sm:grid-cols-3">
          {footerGroups.map((group) => (
            <div key={group.title}>
              <h2 className="text-sm font-semibold text-accent">
                {group.title}
              </h2>
              <ul className="mt-4 space-y-3">
                {group.links.map((link) => (
                  <li key={link}>
                    <Link
                      href="#"
                      className="text-sm text-primary-foreground/72 transition-colors hover:text-primary-foreground"
                    >
                      {link}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <NewsletterForm />
      </div>
      <div className="border-t border-primary-foreground/10 px-6 py-4">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 text-xs text-primary-foreground/60 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 Show Time. All rights reserved.</p>
          <p>Built for fast, secure booking flows.</p>
        </div>
      </div>
    </footer>
  );
}
