"use client";

import type { User } from "firebase/auth";

export type AccountRole = "CUSTOMER" | "ORGANIZER" | "ADMIN";
export type AccountSessionPayload = {
  user?: { role: AccountRole };
  error?: string;
};

async function readSessionPayload(response: Response) {
  const body = await response.text();
  if (!body.trim()) {
    return {
      error:
        "The account service did not return a response. Please try again shortly.",
    };
  }

  try {
    return JSON.parse(body) as AccountSessionPayload;
  } catch {
    return {
      error:
        "The account service returned an invalid response. Please try again shortly.",
    };
  }
}

export async function fetchAccountSession(user: User) {
  for (const forceRefresh of [false, true]) {
    const token = await user.getIdToken(forceRefresh);
    const response = await fetch("/api/auth/session", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const payload = await readSessionPayload(response);

    if (response.status !== 401 || forceRefresh) {
      return { ok: response.ok, status: response.status, payload };
    }
  }

  throw new Error("Unable to verify your account.");
}
