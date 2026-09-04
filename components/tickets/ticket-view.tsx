"use client";

import { useEffect, useRef, useState } from "react";
import { Download, LoaderCircle, Maximize2 } from "lucide-react";
import { toPng } from "html-to-image";
import { toDataURL } from "qrcode";
import { firebaseAuth } from "@/lib/firebase/client";

type Ticket = {
  ticketId: string;
  bookingId: string;
  customerName: string;
  eventOrMovieName: string;
  venue: string;
  date: string;
  time: string;
  seatNumbers: string[];
  ticketCategory: string;
  totalPayment: number;
  bookingStatus: string;
  qrPayload: string;
};

export function TicketView({ ticketId }: { ticketId: string }) {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [qr, setQr] = useState("");
  const [error, setError] = useState("");
  const [fullScreen, setFullScreen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      const token = await firebaseAuth.currentUser?.getIdToken();
      if (!token) return setError("Sign in to view this ticket.");
      const response = await fetch(
        `/api/tickets/${encodeURIComponent(ticketId)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const payload = (await response.json()) as {
        ticket?: Ticket;
        error?: string;
      };
      if (!response.ok || !payload.ticket)
        return setError(payload.error ?? "Unable to load ticket.");
      setTicket(payload.ticket);
      setQr(
        await toDataURL(payload.ticket.qrPayload, { width: 460, margin: 1 }),
      );
    };
    void load().catch(() => setError("Unable to load ticket."));
  }, [ticketId]);

  const download = async () => {
    if (!cardRef.current || !ticket) return;
    const image = await toPng(cardRef.current, { pixelRatio: 2 });
    const link = document.createElement("a");
    link.href = image;
    link.download = `${ticket.ticketId}.png`;
    link.click();
  };

  if (error)
    return (
      <p className="rounded-md border border-accent/50 bg-accent/10 p-5 text-sm">
        {error}
      </p>
    );
  if (!ticket || !qr)
    return (
      <div className="grid min-h-80 place-items-center">
        <LoaderCircle className="size-5 animate-spin" />
      </div>
    );

  return (
    <div className="mx-auto w-full max-w-xl">
      <div
        ref={cardRef}
        className="rounded-md border border-border bg-surface p-4 sm:p-6"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-secondary">
          Confirmed ticket
        </p>
        <h1 className="mt-2 text-2xl font-semibold">
          {ticket.eventOrMovieName}
        </h1>
        <p className="mt-1 text-sm text-muted">{ticket.venue}</p>
        <div className="mt-6 grid gap-3 border-y border-border py-5 text-sm sm:grid-cols-2">
          <p>
            <span className="text-muted">Date</span>
            <br />
            {new Date(ticket.date).toLocaleDateString("en-IN")}
          </p>
          <p>
            <span className="text-muted">Time</span>
            <br />
            {new Date(ticket.time).toLocaleTimeString("en-IN", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
          <p>
            <span className="text-muted">Seats</span>
            <br />
            {ticket.seatNumbers.join(", ")}
          </p>
          <p>
            <span className="text-muted">Category</span>
            <br />
            {ticket.ticketCategory}
          </p>
        </div>
        <div className="mt-6 grid place-items-center">
          {/* QR payload is a local data URL, not a remote content image. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qr}
            alt="Scannable ticket QR code"
            className="size-64 max-w-full bg-white p-2 sm:size-72"
          />
        </div>
        <p className="mt-4 text-center font-mono text-xs text-muted">
          {ticket.ticketId}
        </p>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setFullScreen(true)}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-cta text-sm font-semibold text-cta-foreground"
        >
          <Maximize2 className="size-4" />
          Show QR
        </button>
        <button
          type="button"
          onClick={() => void download()}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-border text-sm font-semibold"
        >
          <Download className="size-4" />
          Download
        </button>
      </div>
      {fullScreen ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-background p-5"
          onClick={() => setFullScreen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Full-screen ticket QR code"
        >
          <button
            type="button"
            onClick={() => setFullScreen(false)}
            className="absolute right-4 top-4 inline-flex h-11 items-center justify-center rounded-md border border-border px-4 text-sm font-semibold"
          >
            Close
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qr}
            alt="Full-screen ticket QR code"
            className="w-[min(86vw,480px)] bg-white p-3"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      ) : null}
    </div>
  );
}
