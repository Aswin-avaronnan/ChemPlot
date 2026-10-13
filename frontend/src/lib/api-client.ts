const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000/api/v1";

export interface TechniqueRunSummary {
  id: string;
  technique: string;
  original_filename: string;
  parse_status: "pending" | "parsing" | "parsed" | "failed";
  scan_rate_mv_s?: number;
  created_at: string;
}

export interface Experiment {
  id: string;
  owner_id: string;
  name: string;
  sample_label?: string;
  notes?: string;
  mass_mg?: number;
  area_cm2?: number;
  active_material_pct?: number;
  reference_electrode?: string;
  electrolyte?: string;
  created_at: string;
  updated_at: string;
  technique_runs: TechniqueRunSummary[];
}

export interface TechniqueRun {
  id: string;
  experiment_id: string;
  technique: string;
  original_filename: string;
  raw_file_key: string;
  parse_status: "pending" | "parsing" | "parsed" | "failed";
  parse_error_code?: string;
  instrument_metadata?: any;
  scan_rate_mv_s?: number;
  mass_mg_override?: number;
  area_cm2_override?: number;
  created_at: string;
}

export interface Segment {
  id: string;
  technique_run_id: string;
  segment_index: number;
  scan_rate_mv_s?: number;
  applied_current_a?: number;
  data: Record<string, any>;
}

export interface Analysis {
  id: string;
  technique_run_id: string;
  analysis_type: string;
  convention: string;
  result: Record<string, any>;
  computed_at: string;
}

export interface OverlayRun {
  run_id: string;
  filename: string;
  technique: string;
  scan_rate_mv_s?: number;
  mass_mg?: number;
  area_cm2?: number;
  active_material_pct?: number;
  segments: Segment[];
}

export interface OverlayData {
  experiment_id: string;
  name: string;
  sample_parameters: {
    mass_mg?: number;
    area_cm2?: number;
    active_material_pct?: number;
    reference_electrode?: string;
    electrolyte?: string;
  };
  runs: OverlayRun[];
}


async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const headers = new Headers(options.headers || {});
  
  if (!(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let errorDetail = "API Error";
    try {
      const errJson = await res.json();
      if (errJson?.error?.message) {
        errorDetail = errJson.error.message;
        if (errJson.error.detail) {
          errorDetail += `: ${errJson.error.detail}`;
        }
      }
    } catch {
      errorDetail = `HTTP ${res.status}: ${res.statusText}`;
    }
    throw new Error(errorDetail);
  }

  if (res.status === 204) {
    return {} as T;
  }

  return res.json();
}

export const api = {
  // Experiments
  listExperiments: () => request<{ experiments: Experiment[]; total: number }>("/experiments"),
  getExperiment: (id: string) => request<Experiment>(`/experiments/${id}`),
  createExperiment: (data: Partial<Experiment>) =>
    request<Experiment>("/experiments", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateExperiment: (id: string, data: Partial<Experiment>) =>
    request<Experiment>(`/experiments/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  deleteExperiment: (id: string) =>
    request<void>(`/experiments/${id}`, {
      method: "DELETE",
    }),

  // Uploads & Runs
  uploadRuns: async (experimentId: string, files: File[], technique?: string) => {
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));
    const query = technique ? `?technique=${technique}` : "";
    return request<Array<{ run_id: string; parse_status: string; technique: string; original_filename: string }>>(
      `/experiments/${experimentId}/runs${query}`,
      {
        method: "POST",
        body: formData,
      }
    );
  },
  getRun: (runId: string) => request<TechniqueRun>(`/runs/${runId}`),
  updateRun: (runId: string, data: Partial<TechniqueRun>) =>
    request<TechniqueRun>(`/runs/${runId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  getRunSegments: (runId: string, limit?: number) => {
    const query = limit ? `?limit=${limit}` : "";
    return request<{ technique_run_id: string; technique: string; total_segments: number; segments: Segment[] }>(
      `/runs/${runId}/segments${query}`
    );
  },
  getExperimentOverlay: (experimentId: string) =>
    request<OverlayData>(`/experiments/${experimentId}/overlay`),

  // Analyses
  runAnalysis: (runId: string, analysisType: string, convention: string, params: Record<string, any> = {}) =>
    request<Analysis>(`/runs/${runId}/analyses`, {
      method: "POST",
      body: JSON.stringify({
        analysis_type: analysisType,
        convention,
        params,
      }),
    }),
  listRunAnalyses: (runId: string) =>
    request<{ technique_run_id: string; analyses: Analysis[] }>(`/runs/${runId}/analyses`),

  // Export
  getExportUrl: (runId: string, format: "png" | "svg" | "pdf" = "png", template: "nature" | "acs" | "default" = "nature") =>
    `${API_BASE_URL}/runs/${runId}/export?format=${format}&template=${template}`,
};
