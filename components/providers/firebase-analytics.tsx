"use client";

import { useEffect } from "react";
import { getFirebaseAnalytics } from "@/lib/firebase/client";

export function FirebaseAnalyticsProvider() {
  useEffect(() => {
    void getFirebaseAnalytics();
  }, []);

  return null;
}
