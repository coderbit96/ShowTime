"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { Camera } from "lucide-react";
import { firebaseAuth } from "@/lib/firebase/client";

type ScanResult = {
  outcome: "APPROVED" | "ALREADY_USED" | "INVALID";
  reason?: string;
  customerName?: string;
  checkedInAt?: string;
};
const queueKey = "show-time-check-in-queue";

export function CheckInScanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const [status, setStatus] = useState<ScanResult | null>(null);
  const [scanning, setScanning] = useState(false);
  const [manual, setManual] = useState("");

  const submit = useCallback(async (qrPayload: string) => {
    if (!navigator.onLine) {
      const queued = JSON.parse(
        localStorage.getItem(queueKey) ?? "[]",
      ) as string[];
      localStorage.setItem(queueKey, JSON.stringify([...queued, qrPayload]));
      setStatus({
        outcome: "INVALID",
        reason: "Scan queued until a connection returns.",
      });
      return;
    }
    const token = await firebaseAuth.currentUser?.getIdToken();
    if (!token)
      return setStatus({ outcome: "INVALID", reason: "Sign in is required." });
    const response = await fetch("/api/organizer/check-in", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ qrPayload }),
    });
    const payload = (await response.json()) as ScanResult & { error?: string };
    setStatus(
      response.ok
        ? payload
        : { outcome: "INVALID", reason: payload.error ?? "Validation failed." },
    );
  }, []);

  const startCamera = async () => {
    if (!videoRef.current || scanning) return;
    setScanning(true);
    const reader = new BrowserMultiFormatReader();
    controlsRef.current = await reader.decodeFromVideoDevice(
      undefined,
      videoRef.current,
      (result) => {
        if (result) {
          controlsRef.current?.stop();
          setScanning(false);
          void submit(result.getText());
        }
      },
    );
  };

  useEffect(() => () => controlsRef.current?.stop(), []);

  useEffect(() => {
    const syncQueuedScans = async () => {
      if (!navigator.onLine) return;
      const queued = JSON.parse(
        localStorage.getItem(queueKey) ?? "[]",
      ) as string[];
      if (!queued.length) return;
      localStorage.removeItem(queueKey);
      for (const qrPayload of queued) await submit(qrPayload);
    };
    void syncQueuedScans();
    window.addEventListener("online", syncQueuedScans);
    return () => window.removeEventListener("online", syncQueuedScans);
  }, [submit]);

  return (
    <main className="mx-auto max-w-xl px-5 py-8">
      <h1 className="text-2xl font-semibold">Entry scanner</h1>
      <video
        ref={videoRef}
        className="mt-5 aspect-square w-full rounded-md bg-surface-muted object-cover"
        muted
        playsInline
      />
      <button
        type="button"
        onClick={() => void startCamera()}
        disabled={scanning}
        className="mt-4 inline-flex h-14 w-full items-center justify-center gap-2 rounded-md bg-secondary text-sm font-semibold text-secondary-foreground"
      >
        <Camera className="size-5" />
        {scanning ? "Scanning..." : "Start camera"}
      </button>
      <div className="mt-5 flex gap-2">
        <input
          value={manual}
          onChange={(event) => setManual(event.target.value)}
          placeholder="Paste QR payload"
          className="h-11 min-w-0 flex-1 rounded-sm border border-border bg-surface px-3 text-sm"
        />
        <button
          type="button"
          onClick={() => void submit(manual)}
          disabled={!manual}
          className="h-11 rounded-sm border border-border px-4 text-sm font-semibold"
        >
          Check
        </button>
      </div>
      {status ? (
        <div
          className={`mt-5 rounded-md p-6 text-center ${status.outcome === "APPROVED" ? "bg-emerald-500 text-white" : status.outcome === "ALREADY_USED" ? "bg-warning text-background" : "bg-accent text-accent-foreground"}`}
        >
          <p className="text-xl font-bold">
            {status.outcome === "APPROVED"
              ? "ENTRY APPROVED"
              : status.outcome === "ALREADY_USED"
                ? "ALREADY USED"
                : "INVALID TICKET"}
          </p>
          <p className="mt-2 text-sm">
            {status.customerName ?? status.reason ?? status.checkedInAt}
          </p>
        </div>
      ) : null}
    </main>
  );
}
