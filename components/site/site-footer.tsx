import Image from "next/image";
import Link from "next/link";

const footerGroups = [
  {
    title: "Explore",
    links: [
      { label: "Movies", href: "/#recommended-movies" },
      { label: "Concerts", href: "/#concerts" },
      { label: "Sports", href: "/#sports" },
      { label: "Experiences", href: "/#weekend-experiences" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Careers", href: "/careers" },
      { label: "Press", href: "/press" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "Help Center", href: "/help" },
      { label: "Cancellation", href: "/cancellation" },
      { label: "Gift Cards", href: "/gift-cards" },
      { label: "Safety", href: "/safety" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-[linear-gradient(180deg,#151522,#0B0B14)] text-primary-foreground">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-12 md:grid-cols-[1.1fr_2fr_1.2fr]">
        <div>
          <Link href="/" className="group inline-flex items-center gap-2">
            <Image
              src="/show-time-logo.svg"
              alt="Show Time"
              width={44}
              height={44}
              className="size-11 drop-shadow-[0_0_22px_rgba(6,182,212,0.32)] transition-transform group-hover:scale-105"
            />
            <span className="text-lg font-semibold group-hover:text-secondary">
              Show Time
            </span>
          </Link>
          <p className="mt-4 max-w-xs text-sm leading-6 text-primary-foreground/72">
            A quieter, sharper way to discover movies, shows, games, and local
            experiences.
          </p>
        </div>

        <div className="grid gap-8 sm:grid-cols-3">
          {footerGroups.map((group) => (
            <div key={group.title}>
              <h2 className="text-sm font-semibold text-secondary">
                {group.title}
              </h2>
              <ul className="mt-4 space-y-3">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-primary-foreground/72 hover:text-secondary"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div>
          <h2 className="text-sm font-semibold text-secondary">Show Time</h2>
          <p className="mt-4 max-w-xs text-sm leading-6 text-primary-foreground/72">
            Movies, live events, sports, and small reasons to spend a night out
            well.
          </p>
        </div>
      </div>
      <div className="border-t border-primary-foreground/10 px-6 py-4">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 text-xs text-primary-foreground/60 sm:flex-row sm:items-center sm:justify-between">
          <p>(c) 2026 Show Time. All rights reserved.</p>
          <p>Built for fast, secure booking flows.</p>
        </div>
      </div>
    </footer>
  );
}
