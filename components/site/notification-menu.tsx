"use client";

import { Bell, CheckCheck, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { firebaseAuth } from "@/lib/firebase/client";

type NotificationItem = {
  id: string;
  title: string;
  body: string;
  type: string;
  readAt: string | null;
  createdAt: string;
};

export function NotificationMenu() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const token = await firebaseAuth.currentUser?.getIdToken();
    if (!token) return setItems([]);
    setLoading(true);
    try {
      const response = await fetch("/api/notifications", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = (await response.json()) as {
        notifications?: NotificationItem[];
      };
      if (response.ok) setItems(payload.notifications ?? []);
    } finally {
      setLoading(false);
    }
  };

  const markAllRead = async () => {
    const token = await firebaseAuth.currentUser?.getIdToken();
    if (!token) return;
    await fetch("/api/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ all: true }),
    });
    setItems((current) =>
      current.map((item) => ({ ...item, readAt: new Date().toISOString() })),
    );
  };

  const unread = items.filter((item) => !item.readAt).length;
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next) void load();
        }}
        className="relative grid size-10 place-items-center rounded-md border border-border bg-surface text-muted transition-colors hover:text-foreground"
        aria-label="Notifications"
        aria-expanded={open}
      >
        <Bell className="size-4" />
        {unread ? (
          <span className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full bg-accent text-[10px] font-bold text-accent-foreground">
            {Math.min(unread, 9)}
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="absolute right-0 top-12 z-50 w-[min(22rem,calc(100vw-2rem))] rounded-md border border-border bg-surface p-2 shadow-2xl shadow-black/30">
          <div className="flex items-center justify-between px-2 py-2">
            <p className="text-sm font-semibold">Notifications</p>
            <button
              type="button"
              onClick={() => void markAllRead()}
              className="inline-flex items-center gap-1 text-xs text-secondary hover:text-foreground"
            >
              <CheckCheck className="size-3.5" /> Mark read
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="grid h-24 place-items-center">
                <LoaderCircle className="size-4 animate-spin" />
              </div>
            ) : null}
            {!loading && !items.length ? (
              <p className="px-2 py-8 text-center text-sm text-muted">
                You are all caught up.
              </p>
            ) : null}
            {items.map((item) => (
              <div
                key={item.id}
                className={`rounded-md px-3 py-3 text-sm ${item.readAt ? "text-muted" : "bg-surface-muted"}`}
              >
                <p className="font-medium text-foreground">{item.title}</p>
                <p className="mt-1 text-xs leading-5">{item.body}</p>
                <p className="mt-1 text-[11px]">
                  {new Date(item.createdAt).toLocaleString("en-IN")}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
