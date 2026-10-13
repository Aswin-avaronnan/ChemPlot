"use client";

import * as React from "react";
import { initAnalytics } from "@/lib/analytics";

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  React.useEffect(() => {
    initAnalytics();
  }, []);

  return <>{children}</>;
}
