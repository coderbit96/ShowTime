"use client";

import { useState, type FormEvent } from "react";
import { CheckCircle2, Mail, Send } from "lucide-react";

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!email.trim()) return;

    setSubmitted(true);
    setEmail("");
  }

  if (submitted) {
    return (
      <div
        className="rounded-xl border border-success/35 bg-success/10 p-5"
        role="status"
      >
        <CheckCircle2 className="size-6 text-success" aria-hidden="true" />
        <h3 className="mt-3 text-base font-semibold text-foreground">
          You&apos;re on the list.
        </h3>
        <p className="mt-1 text-sm leading-6 text-muted">
          Your next hand-picked guide will arrive soon.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Mail className="size-4 text-primary" aria-hidden="true" />
        Get the weekly edit
      </div>
      <p id="newsletter-hint" className="mt-1.5 text-xs leading-5 text-muted">
        New releases, city picks, and useful plans—once a week.
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <label className="sr-only" htmlFor="newsletter-email">
          Email address
        </label>
        <input
          id="newsletter-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          required
          autoComplete="email"
          aria-describedby="newsletter-hint newsletter-privacy"
          className="h-12 min-w-0 flex-1 rounded-xl border border-border bg-background/75 px-4 text-sm text-foreground outline-none placeholder:text-muted transition focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        <button
          type="submit"
          className="premium-button h-12 justify-center gap-2 px-4 text-sm font-semibold sm:min-w-32"
        >
          Get picks
          <Send className="size-4" aria-hidden="true" />
        </button>
      </div>
      <p id="newsletter-privacy" className="mt-3 text-xs text-muted">
        One useful email a week. Unsubscribe whenever you like.
      </p>
    </form>
  );
}
