import posthog from "posthog-js";

let isInitialized = false;

export function initAnalytics(): void {
  if (typeof window === "undefined" || isInitialized) return;

  const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://app.posthog.com";

  if (posthogKey) {
    posthog.init(posthogKey, {
      api_host: posthogHost,
      person_profiles: "identified_only",
      capture_pageview: true,
      capture_pageleave: true,
      autocapture: false,
    });
    isInitialized = true;
  }
}

export function trackEvent(eventName: string, properties?: Record<string, any>): void {
  if (typeof window === "undefined") return;
  if (!isInitialized) {
    // If not configured with key, log trace for debugging in dev
    if (process.env.NODE_ENV === "development") {
      console.debug(`[PostHog Mock] ${eventName}`, properties);
    }
    return;
  }
  posthog.capture(eventName, properties);
}

// ── Specific PM Funnel Milestone Events ──────────────────────────────────────

export function trackExperimentCreated(params: {
  experimentId: string;
  name: string;
  sampleLabel?: string;
}): void {
  trackEvent("experiment_created", {
    experiment_id: params.experimentId,
    name: params.name,
    sample_label: params.sampleLabel,
  });
}

export function trackRunsUploaded(params: {
  experimentId: string;
  fileCount: number;
  declaredTechnique?: string;
  filenames: string[];
}): void {
  trackEvent("runs_uploaded", {
    experiment_id: params.experimentId,
    file_count: params.fileCount,
    technique: params.declaredTechnique || "auto",
    filenames: params.filenames,
  });
}

export function trackPlotViewed(params: {
  experimentId: string;
  technique?: string;
  mode: "overlay" | "single";
  runId?: string | null;
}): void {
  trackEvent("plot_viewed", {
    experiment_id: params.experimentId,
    technique: params.technique,
    mode: params.mode,
    run_id: params.runId,
  });
}

export function trackAnalysisComputed(params: {
  experimentId: string;
  runId: string;
  analysisType: string;
  convention: string;
}): void {
  trackEvent("analysis_computed", {
    experiment_id: params.experimentId,
    run_id: params.runId,
    analysis_type: params.analysisType,
    convention: params.convention,
  });
}

export function trackFigureExported(params: {
  experimentId: string;
  runId: string;
  technique: string;
  format: "png" | "svg" | "pdf";
  template: "nature" | "acs" | "default";
}): void {
  trackEvent("figure_exported", {
    experiment_id: params.experimentId,
    run_id: params.runId,
    technique: params.technique,
    format: params.format,
    template: params.template,
  });
}

export function trackSampleParamsUpdated(params: {
  experimentId: string;
  massMg?: number | null;
  areaCm2?: number | null;
  activePct?: number | null;
}): void {
  trackEvent("sample_parameters_updated", {
    experiment_id: params.experimentId,
    mass_mg: params.massMg,
    area_cm2: params.areaCm2,
    active_pct: params.activePct,
  });
}
