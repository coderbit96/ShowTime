"use client";

import { useState, type FormEvent } from "react";
import { Send } from "lucide-react";

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!email) {
      return;
    }

    setSubmitted(true);
    setEmail("");
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-sm flex-col gap-3">
      <label htmlFor="newsletter-email" className="text-sm font-medium">
        Get weekly picks
      </label>
      <div className="flex gap-2">
        <input
          id="newsletter-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          className="h-11 min-w-0 flex-1 rounded-md border border-border bg-surface px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted focus:border-primary"
        />
        <button
          type="submit"
          className="grid size-11 shrink-0 place-items-center rounded-md bg-accent text-accent-foreground transition-colors hover:bg-warning"
          aria-label="Subscribe"
        >
          <Send className="size-4" aria-hidden="true" />
        </button>
      </div>
      {submitted ? (
        <p className="text-sm text-accent">Subscribed for early drops.</p>
      ) : null}
    </form>
  );
}
