"use client";

import {
  Check,
  LoaderCircle,
  RotateCcw,
  Search,
  StickyNote,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { firebaseAuth } from "@/lib/firebase/client";

type Person = { name?: string; email?: string; phone?: string };
type Content = { title?: string };
type Refund = {
  _id: string;
  requestedAmount: number;
  approvedAmount?: number;
  cancellationFee?: number;
  reason?: string;
  refundMethod?: string;
  status: string;
  cancellationPolicyApplied: string;
  adminNote?: string;
  failureReason?: string;
  gatewayRefundId?: string;
  createdAt: string;
  booking?: {
    _id: string;
    user?: Person;
    show?: {
      event?: Content;
      movie?: Content;
    };
  };
  payment?: {
    _id: string;
    gatewayPaymentId?: string;
    paymentMethod?: string;
    status?: string;
  };
};
type Action = "approve" | "reject" | "review" | "retry" | "note";
const money = (amount?: number) =>
  `₹${Number(amount ?? 0).toLocaleString("en-IN")}`;

export function RefundManager() {
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [drafts, setDrafts] = useState<
    Record<string, { amount: string; note: string }>
  >({});

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

  const draftFor = (refund: Refund) =>
    drafts[refund._id] ?? {
      amount: String(refund.approvedAmount ?? refund.requestedAmount),
      note: refund.adminNote ?? "",
    };
  const updateDraft = (
    refund: Refund,
    values: Partial<{ amount: string; note: string }>,
  ) =>
    setDrafts((current) => ({
      ...current,
      [refund._id]: { ...draftFor(refund), ...values },
    }));
  const action = async (
    refund: Refund,
    actionName: Action,
    fullAmount = false,
  ) => {
    const draft = draftFor(refund);
    const approvedAmount = fullAmount
      ? refund.requestedAmount
      : Number(draft.amount);
    if (
      ["approve", "retry"].includes(actionName) &&
      (!Number.isFinite(approvedAmount) ||
        approvedAmount < 0 ||
        approvedAmount > refund.requestedAmount)
    ) {
      setError("Enter a refund amount between ₹0 and the requested amount.");
      return;
    }
    try {
      setWorkingId(refund._id);
      setError("");
      await request(`/api/admin/refunds/${refund._id}/${actionName}`, {
        method: "POST",
        body: JSON.stringify({
          ...(actionName === "approve" || actionName === "retry"
            ? { approvedAmount }
            : {}),
          ...(draft.note.trim() ? { note: draft.note.trim() } : {}),
        }),
      });
      setNotice(
        actionName === "approve" || actionName === "retry"
          ? "Refund sent to the payment gateway and marked refunded only after processing succeeds."
          : "Refund updated.",
      );
      await load();
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Unable to update refund.",
      );
    } finally {
      setWorkingId("");
    }
  };
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return refunds.filter((refund) => {
      if (status !== "ALL" && refund.status !== status) return false;
      if (!normalized) return true;
      return [
        refund._id,
        refund.booking?._id,
        refund.payment?.gatewayPaymentId,
        refund.booking?.user?.name,
        refund.booking?.user?.email,
      ].some((value) =>
        String(value ?? "")
          .toLowerCase()
          .includes(normalized),
      );
    });
  }, [query, refunds, status]);

  return (
    <main className="min-h-screen bg-background px-5 py-8 text-foreground sm:px-8">
      <div className="mx-auto max-w-7xl">
        <p className="text-sm font-semibold text-secondary">Admin finance</p>
        <h1 className="mt-2 text-3xl font-semibold">Refund operations</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
          Review refund requests, send approved amounts to Razorpay, and track
          each outcome without exposing payment details.
        </p>
        {error ? (
          <p className="mt-5 rounded-md border border-accent/50 bg-accent/10 p-3 text-sm">
            {error}
          </p>
        ) : null}
        {notice ? (
          <p className="mt-5 rounded-md border border-secondary/40 bg-secondary/10 p-3 text-sm">
            {notice}
          </p>
        ) : null}

        <div className="mt-7 flex flex-wrap gap-3">
          <label className="flex h-10 min-w-64 items-center gap-2 rounded-md border border-border bg-surface px-3 text-muted">
            <Search className="size-4" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Booking, transaction, customer"
              className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none"
            />
          </label>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="h-10 rounded-md border border-border bg-surface px-3 text-sm"
          >
            <option value="ALL">All statuses</option>
            <option value="REQUESTED">Requested</option>
            <option value="UNDER_REVIEW">Under review</option>
            <option value="PROCESSING">Processing</option>
            <option value="REFUNDED">Refunded</option>
            <option value="FAILED">Failed</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>

        {loading ? (
          <div className="mt-10 grid place-items-center">
            <LoaderCircle className="size-5 animate-spin" />
          </div>
        ) : (
          <div className="mt-5 grid gap-4">
            {filtered.length ? (
              filtered.map((refund) => {
                const show = refund.booking?.show;
                const draft = draftFor(refund);
                const isWorking = workingId === refund._id;
                const canReview = refund.status === "REQUESTED";
                const canDecide = ["REQUESTED", "UNDER_REVIEW"].includes(
                  refund.status,
                );
                return (
                  <article
                    key={refund._id}
                    className="rounded-lg border border-border bg-surface p-5 shadow-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                          Refund ID · {refund._id}
                        </p>
                        <h2 className="mt-1 font-semibold">
                          {show?.event?.title ??
                            show?.movie?.title ??
                            "Cancelled booking"}
                        </h2>
                        <p className="mt-1 text-sm text-muted">
                          Booking ID · {refund.booking?._id ?? "Unavailable"} ·
                          Transaction ID ·{" "}
                          {refund.payment?.gatewayPaymentId ??
                            refund.payment?._id ??
                            "Pending"}
                        </p>
                      </div>
                      <span className="rounded-full border border-secondary/40 bg-secondary/10 px-3 py-1 text-xs font-semibold text-secondary">
                        {(refund.status === "SUCCESS"
                          ? "REFUNDED"
                          : refund.status
                        ).replaceAll("_", " ")}
                      </span>
                    </div>
                    <div className="grid gap-5 py-4 text-sm sm:grid-cols-2 xl:grid-cols-4">
                      <Info title="Customer">
                        {refund.booking?.user?.name ?? "Customer"}
                        <span>
                          {refund.booking?.user?.email ?? "Email unavailable"}
                        </span>
                        <span>
                          {refund.booking?.user?.phone ?? "Mobile unavailable"}
                        </span>
                      </Info>
                      <Info title="Request">
                        {refund.reason ?? "Customer cancellation"}
                        <span>{refund.cancellationPolicyApplied}</span>
                        <span>
                          Requested {money(refund.requestedAmount)} · Fee{" "}
                          {money(refund.cancellationFee)}
                        </span>
                      </Info>
                      <Info title="Refund">
                        {refund.refundMethod?.replaceAll("_", " ") ??
                          "Original payment method"}
                        <span>
                          Approved{" "}
                          {money(
                            refund.approvedAmount ?? refund.requestedAmount,
                          )}
                        </span>
                        <span>
                          {refund.gatewayRefundId
                            ? `Gateway refund ${refund.gatewayRefundId}`
                            : "Gateway refund not issued"}
                        </span>
                      </Info>
                      <Info title="Payment">
                        {refund.payment?.paymentMethod ??
                          "Original method pending"}
                        <span>
                          {refund.payment?.status ?? "No payment record"}
                        </span>
                        <span>
                          Requested{" "}
                          {new Date(refund.createdAt).toLocaleString("en-IN")}
                        </span>
                      </Info>
                    </div>
                    {refund.failureReason ? (
                      <p className="mb-4 rounded-md border border-accent/40 bg-accent/10 p-3 text-sm">
                        Gateway issue: {refund.failureReason}
                      </p>
                    ) : null}
                    <div className="grid gap-3 border-t border-border pt-4 lg:grid-cols-[10rem_minmax(0,1fr)_auto]">
                      <label className="grid gap-1 text-xs font-medium text-muted">
                        Refund amount
                        <input
                          type="number"
                          min="0"
                          max={refund.requestedAmount}
                          step="0.01"
                          value={draft.amount}
                          onChange={(event) =>
                            updateDraft(refund, { amount: event.target.value })
                          }
                          disabled={!canDecide && refund.status !== "FAILED"}
                          className="h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground disabled:opacity-60"
                        />
                      </label>
                      <label className="grid gap-1 text-xs font-medium text-muted">
                        Admin note
                        <textarea
                          value={draft.note}
                          onChange={(event) =>
                            updateDraft(refund, { note: event.target.value })
                          }
                          placeholder="Reason, decision, or gateway follow-up"
                          rows={2}
                          className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                        />
                      </label>
                      <div className="flex flex-wrap items-end gap-2">
                        {canReview ? (
                          <Button
                            disabled={isWorking}
                            onClick={() => void action(refund, "review")}
                          >
                            Review
                          </Button>
                        ) : null}
                        {canDecide ? (
                          <>
                            <Button
                              primary
                              disabled={isWorking}
                              onClick={() =>
                                void action(refund, "approve", true)
                              }
                            >
                              <Check className="size-3.5" /> Full refund
                            </Button>
                            <Button
                              disabled={isWorking}
                              onClick={() => void action(refund, "approve")}
                            >
                              Process amount
                            </Button>
                            <Button
                              danger
                              disabled={isWorking}
                              onClick={() => void action(refund, "reject")}
                            >
                              <X className="size-3.5" /> Reject
                            </Button>
                          </>
                        ) : null}
                        {refund.status === "FAILED" ? (
                          <Button
                            warning
                            disabled={isWorking}
                            onClick={() => void action(refund, "retry")}
                          >
                            <RotateCcw className="size-3.5" /> Retry
                          </Button>
                        ) : null}
                        {!canDecide && refund.status !== "FAILED" ? (
                          <Button
                            disabled={isWorking}
                            onClick={() => void action(refund, "note")}
                          >
                            <StickyNote className="size-3.5" /> Save note
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </article>
                );
              })
            ) : (
              <p className="rounded-md border border-dashed border-border p-5 text-sm text-muted">
                No refunds match these filters.
              </p>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

function Info({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <p className="font-semibold">{title}</p>
      <div>{children}</div>
    </div>
  );
}

function Button({
  children,
  disabled,
  onClick,
  primary,
  danger,
  warning,
}: {
  children: React.ReactNode;
  disabled: boolean;
  onClick: () => void;
  primary?: boolean;
  danger?: boolean;
  warning?: boolean;
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex h-10 items-center gap-1 rounded-md border px-3 text-xs font-semibold disabled:opacity-50 ${primary ? "border-primary bg-primary text-primary-foreground" : danger ? "border-accent/50 text-accent" : warning ? "border-warning/50 text-warning" : "border-border text-muted"}`}
    >
      {children}
    </button>
  );
}
