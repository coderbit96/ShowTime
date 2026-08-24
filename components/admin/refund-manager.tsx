"use client";

import { Check, LoaderCircle, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { firebaseAuth } from "@/lib/firebase/client";

type Refund = {
  _id: string;
  requestedAmount: number;
  approvedAmount?: number;
  status: string;
  cancellationPolicyApplied: string;
  createdAt: string;
  booking?: { _id: string; status: string; seats: { seatId: string }[] };
};

export function RefundManager() {
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const request = useCallback(async (path: string, init: RequestInit = {}) => {
    const token = await firebaseAuth.currentUser?.getIdToken();
    if (!token) throw new Error("Sign in as an admin to manage refunds.");
    const response = await fetch(path, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...init.headers,
      },
    });
    const payload = (await response.json()) as {
      error?: string;
      refunds?: Refund[];
    };
    if (!response.ok) throw new Error(payload.error ?? "Request failed.");
    return payload;
  }, []);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await request("/api/admin/refunds");
      setRefunds(result.refunds ?? []);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load refunds.",
      );
    } finally {
      setLoading(false);
    }
  }, [request]);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  const action = async (refund: Refund, actionName: "approve" | "reject") => {
    try {
      await request(`/api/admin/refunds/${refund._id}/${actionName}`, {
        method: "POST",
        body:
          actionName === "approve"
            ? JSON.stringify({ approvedAmount: refund.requestedAmount })
            : undefined,
      });
      await load();
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Unable to update refund.",
      );
    }
  };
  return (
    <main className="min-h-screen bg-background px-5 py-8">
      <div className="mx-auto max-w-5xl">
        <p className="text-sm font-semibold text-secondary">Admin finance</p>
        <h1 className="mt-2 text-3xl font-semibold">Refund approvals</h1>
        <p className="mt-2 text-sm text-muted">
          Gateway refunds run only after an explicit approval.
        </p>
        {error ? (
          <p className="mt-5 rounded-md border border-accent/50 bg-accent/10 p-3 text-sm">
            {error}
          </p>
        ) : null}
        {loading ? (
          <div className="mt-8 grid place-items-center">
            <LoaderCircle className="size-5 animate-spin" />
          </div>
        ) : (
          <div className="mt-7 grid gap-3">
            {refunds.length ? (
              refunds.map((refund) => (
                <article
                  key={refund._id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-md border border-border bg-surface p-4"
                >
                  <div>
                    <p className="font-semibold">
                      INR {refund.requestedAmount} requested
                    </p>
                    <p className="mt-1 text-sm text-muted">
                      {refund.cancellationPolicyApplied}
                    </p>
                    <p className="mt-2 text-xs font-semibold text-secondary">
                      {refund.status}
                    </p>
                  </div>
                  {refund.status === "REQUESTED" ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => void action(refund, "approve")}
                        className="grid size-9 place-items-center rounded-md bg-primary text-primary-foreground"
                        title="Approve refund"
                      >
                        <Check className="size-4" />
                      </button>
                      <button
                        onClick={() => void action(refund, "reject")}
                        className="grid size-9 place-items-center rounded-md border border-accent/50 text-accent"
                        title="Reject refund"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  ) : null}
                </article>
              ))
            ) : (
              <p className="rounded-md border border-dashed border-border p-5 text-sm text-muted">
                No refund requests yet.
              </p>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
