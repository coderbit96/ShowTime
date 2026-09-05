import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Headphones,
  MapPin,
  ShieldCheck,
  TicketCheck,
} from "lucide-react";
import { Magnetic } from "@/components/motion";

const footerGroups = [
  {
    title: "Discover",
    links: [
      { label: "Movies", href: "/#recommended-movies" },
      { label: "Live events", href: "/#live-events" },
      { label: "Concerts", href: "/#concerts" },
      { label: "Weekend plans", href: "/#weekend-experiences" },
    ],
  },
  {
    title: "Show Time",
    links: [
      { label: "About us", href: "/about" },
      { label: "Careers", href: "/careers" },
      { label: "Press room", href: "/press" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Help & policies",
    links: [
      { label: "Help center", href: "/help" },
      { label: "Cancellation policy", href: "/cancellation" },
      { label: "Gift cards", href: "/gift-cards" },
      { label: "Safety", href: "/safety" },
    ],
  },
];

const confidencePoints = [
  { icon: ShieldCheck, label: "Secure payments" },
  { icon: TicketCheck, label: "Verified tickets" },
  { icon: Headphones, label: "Helpful support" },
];

export function SiteFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative overflow-hidden border-t border-border bg-[radial-gradient(circle_at_12%_0%,rgba(124,58,237,0.12),transparent_28%),radial-gradient(circle_at_88%_18%,rgba(6,182,212,0.1),transparent_24%),linear-gradient(180deg,#EEF3F8_0%,#F7F9FC_78%)] text-foreground">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent" />

      <div className="mx-auto max-w-7xl px-5 py-12 sm:px-6 sm:py-16">
        <div className="grid gap-11 lg:grid-cols-[1.05fr_1.65fr_0.92fr] lg:gap-12">
          <div>
            <Link href="/" className="group inline-flex items-center gap-3">
              <Image
                src="/show-time-logo.svg"
                alt="Show Time"
                width={48}
                height={48}
                className="size-12 drop-shadow-[0_0_24px_rgba(6,182,212,0.38)] transition-transform duration-200 group-hover:scale-105"
              />
              <span className="text-xl font-semibold tracking-tight transition-colors group-hover:text-secondary">
                Show Time
              </span>
            </Link>
            <p className="mt-5 max-w-sm text-sm leading-6 text-muted">
              Great movies, memorable events, and easier plans for every kind of
              evening.
            </p>
            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-medium text-foreground">
              <MapPin className="size-3.5 text-primary" aria-hidden="true" />
              Made for nights out across India
            </div>
            <Link
              href="/search"
              className="group mt-6 inline-flex items-center gap-2 text-sm font-semibold text-secondary transition-colors hover:text-primary"
            >
              Find your next plan
              <ArrowRight
                className="size-4 transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </Link>
          </div>

          <div className="grid gap-8 sm:grid-cols-3 sm:gap-6">
            {footerGroups.map((group) => (
              <div key={group.title}>
                <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-secondary">
                  {group.title}
                </h2>
                <ul className="mt-4 space-y-3">
                  {group.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="text-sm text-muted transition-colors hover:text-foreground"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <aside className="rounded-2xl border border-primary/25 bg-surface/90 p-5 shadow-[0_18px_46px_rgba(15,23,42,0.1)] backdrop-blur-sm">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">
              Need a hand?
            </p>
            <h2 className="mt-3 text-lg font-semibold tracking-tight">
              Plans should feel easy.
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              Get booking help, check cancellation options, or find answers in
              minutes.
            </p>
            <Magnetic className="mt-5 w-full" strength={0.08}>
              <Link
                href="/help"
                className="premium-button h-10 w-full justify-center gap-2 px-4 text-sm font-semibold"
              >
                Visit help center
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </Magnetic>
          </aside>
        </div>

        <div className="mt-11 grid gap-3 border-y border-border/85 py-5 sm:grid-cols-3 sm:gap-0">
          {confidencePoints.map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex items-center justify-center gap-2 text-xs font-medium text-muted sm:border-r sm:border-border sm:last:border-r-0"
            >
              <Icon className="size-4 text-primary" aria-hidden="true" />
              {label}
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3 pt-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© {currentYear} Show Time. All rights reserved.</p>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <Link
              href="/safety"
              className="transition-colors hover:text-foreground"
            >
              Safe booking
            </Link>
            <Link
              href="/cancellation"
              className="transition-colors hover:text-foreground"
            >
              Cancellation help
            </Link>
            <Link
              href="/contact"
              className="transition-colors hover:text-foreground"
            >
              Contact support
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
