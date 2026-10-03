"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import {
  api,
  Experiment,
  TechniqueRun,
  Segment,
  OverlayData,
} from "@/lib/api-client";
import { SampleParametersBar } from "@/components/experiment/sample-parameters-bar";
import { SampleParametersModal } from "@/components/experiment/sample-parameters-modal";
import { MPRUploadModal } from "@/components/upload/mpr-upload-modal";
import { CVPlot } from "@/components/charts/cv-plot";
import { GCDPlot } from "@/components/charts/gcd-plot";
import { CyclingRetentionPlot } from "@/components/charts/cycling-retention-plot";
import { NyquistPlot } from "@/components/charts/nyquist-plot";
import { BodePlot } from "@/components/charts/bode-plot";
import { CVAnalysisCard } from "@/components/analysis/cv-analysis-card";
import { GCDAnalysisCard } from "@/components/analysis/gcd-analysis-card";
import { PEISAnalysisCard } from "@/components/analysis/peis-analysis-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import {
  UploadCloud,
  Sliders,
  Download,
  Loader2,
  AlertCircle,
  FileX,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Check,
  Hourglass,
} from "lucide-react";

// Poll interval in ms while any run is in pending/parsing state
const POLL_INTERVAL_MS = 2500;

function parseStatusBadge(status: string) {
  switch (status) {
    case "parsed":
      return <Badge variant="success"><Check className="w-2.5 h-2.5" /> Parsed</Badge>;
    case "parsing":
      return <Badge variant="warning"><Loader2 className="w-2.5 h-2.5 animate-spin" /> Parsing</Badge>;
    case "pending":
      return <Badge variant="warning"><Hourglass className="w-2.5 h-2.5" /> Pending</Badge>;
    case "failed":
      return <Badge variant="danger"><AlertCircle className="w-2.5 h-2.5" /> Failed</Badge>;
    default:
      return <Badge variant="neutral">{status}</Badge>;
  }
}

export default function ExperimentPage() {
  const { id } = useParams<{ id: string }>();

  const [experiment, setExperiment] = React.useState<Experiment | null>(null);
  const [overlayData, setOverlayData] = React.useState<OverlayData | null>(null);
  const [selectedRunId, setSelectedRunId] = React.useState<string | null>(null);
  const [runSegments, setRunSegments] = React.useState<Segment[]>([]);
  const [activeTab, setActiveTab] = React.useState<string>("plot");
  const [plotMode, setPlotMode] = React.useState<"overlay" | "single">("overlay");

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [showParamsModal, setShowParamsModal] = React.useState(false);
  const [showUploadModal, setShowUploadModal] = React.useState(false);
  const [exportFormat, setExportFormat] = React.useState<"png" | "svg" | "pdf">("png");
  const [exportTemplate, setExportTemplate] = React.useState<"nature" | "acs" | "default">("nature");

  // ── Data fetching ──────────────────────────────────────────────────────────
  const fetchExperiment = React.useCallback(async (silent = false) => {
    if (!id) return;
    if (!silent) setLoading(true);
    try {
      const exp = await api.getExperiment(id as string);
      setExperiment(exp);

      // Auto-select first parsed run
      const firstParsed = exp.technique_runs.find((r) => r.parse_status === "parsed");
      if (firstParsed && !selectedRunId) {
        setSelectedRunId(firstParsed.id);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load experiment.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [id, selectedRunId]);

  const fetchOverlay = React.useCallback(async () => {
    if (!id) return;
    try {
      const data = await api.getExperimentOverlay(id as string);
      setOverlayData(data);
    } catch {
      // overlay may be empty if no runs parsed yet
    }
  }, [id]);

  const fetchRunSegments = React.useCallback(async (runId: string) => {
    try {
      const res = await api.getRunSegments(runId);
      setRunSegments(res.segments);
    } catch {
      setRunSegments([]);
    }
  }, []);

  // Initial load
  React.useEffect(() => {
    fetchExperiment();
  }, [id]);

  // Fetch overlay + segments when experiment updates
  React.useEffect(() => {
    if (experiment) {
      fetchOverlay();
    }
  }, [experiment]);

  React.useEffect(() => {
    if (selectedRunId) {
      fetchRunSegments(selectedRunId);
    }
  }, [selectedRunId]);

  // Polling while runs are pending/parsing
  React.useEffect(() => {
    if (!experiment) return;
    const hasPendingRuns = experiment.technique_runs.some(
      (r) => r.parse_status === "pending" || r.parse_status === "parsing"
    );
    if (!hasPendingRuns) return;

    const timer = setTimeout(async () => {
      await fetchExperiment(true);
      await fetchOverlay();
    }, POLL_INTERVAL_MS);

    return () => clearTimeout(timer);
  }, [experiment, fetchExperiment, fetchOverlay]);

  // ── Derived state ──────────────────────────────────────────────────────────
  const selectedRun = experiment?.technique_runs.find((r) => r.id === selectedRunId) || null;
  const currentTechnique = selectedRun?.technique || overlayData?.runs[0]?.technique;

  const cvOverlayRuns = overlayData?.runs.filter((r) => r.technique === "CV") || [];
  const gcplRuns = overlayData?.runs.filter((r) => r.technique === "GCPL") || [];
  const cyclingRuns = overlayData?.runs.filter((r) => r.technique === "CYCLING") || [];
  const peisRuns = overlayData?.runs.filter((r) => ["PEIS", "SPEIS"].includes(r.technique)) || [];

  const massMg = experiment?.mass_mg;
  const areaCm2 = experiment?.area_cm2;
  const refElectrode = experiment?.reference_electrode || "Ref";

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-screen">
        <Loader2 className="w-6 h-6 animate-spin text-ink-muted" />
      </div>
    );
  }

  if (error || !experiment) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-screen gap-3 text-center px-6">
        <FileX className="w-10 h-10 text-border" />
        <p className="text-sm text-ink-muted">{error || "This experiment doesn't exist or was deleted."}</p>
        <Button variant="secondary" size="sm" onClick={() => fetchExperiment()}>
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Retry
        </Button>
      </div>
    );
  }

  const hasParsedRuns = experiment.technique_runs.some((r) => r.parse_status === "parsed");

  const renderPlot = () => {
    if (!hasParsedRuns) return null;

    if (plotMode === "overlay") {
      if (cvOverlayRuns.length > 0) {
        return (
          <CVPlot
            overlayRuns={cvOverlayRuns}
            massMg={massMg}
            areaCm2={areaCm2}
            referenceElectrode={refElectrode}
            title={`${experiment.name} — CV Multi-Rate Overlay`}
          />
        );
      }
      if (peisRuns.length > 0) {
        return (
          <div className="space-y-6">
            <NyquistPlot
              segments={peisRuns[0]?.segments || []}
              areaCm2={areaCm2}
              title={`${experiment.name} — Nyquist`}
            />
            <BodePlot
              segments={peisRuns[0]?.segments || []}
              title={`${experiment.name} — Bode`}
            />
          </div>
        );
      }
      if (cyclingRuns.length > 0) {
        return (
          <div className="space-y-6">
            <CyclingRetentionPlot
              segments={cyclingRuns.flatMap((r) => r.segments)}
              massMg={massMg}
              areaCm2={areaCm2}
              title={`${experiment.name} — Cycling Retention`}
            />
            <GCDPlot
              segments={cyclingRuns[0]?.segments || []}
              massMg={massMg}
              areaCm2={areaCm2}
              referenceElectrode={refElectrode}
              title={`${experiment.name} — Representative GCD Profile`}
            />
          </div>
        );
      }
      if (gcplRuns.length > 0) {
        return (
          <div className="space-y-6">
            {gcplRuns[0]?.segments && gcplRuns[0].segments.length >= 4 && (
              <CyclingRetentionPlot
                segments={gcplRuns[0].segments}
                massMg={massMg}
                areaCm2={areaCm2}
                title={`${experiment.name} — Capacity Retention`}
              />
            )}
            <GCDPlot
              segments={gcplRuns[0]?.segments || []}
              massMg={massMg}
              areaCm2={areaCm2}
              referenceElectrode={refElectrode}
              title={`${experiment.name} — GCD Profile`}
            />
          </div>
        );
      }
    }

    // Single run view
    if (!selectedRun || !runSegments.length) {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-ink-muted text-sm gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading segments...
        </div>
      );
    }

    if (selectedRun.technique === "CV") {
      return (
        <CVPlot
          segments={runSegments}
          massMg={massMg}
          areaCm2={areaCm2}
          referenceElectrode={refElectrode}
          title={`${experiment.name} — ${selectedRun.original_filename}`}
        />
      );
    }
    if (selectedRun.technique === "CYCLING") {
      return (
        <div className="space-y-6">
          <CyclingRetentionPlot
            segments={runSegments}
            massMg={massMg}
            areaCm2={areaCm2}
            title={`${experiment.name} — ${selectedRun.original_filename} (Retention)`}
          />
          <GCDPlot
            segments={runSegments}
            massMg={massMg}
            areaCm2={areaCm2}
            referenceElectrode={refElectrode}
            title={`${experiment.name} — ${selectedRun.original_filename} (Profile)`}
          />
        </div>
      );
    }
    if (selectedRun.technique === "GCPL") {
      return (
        <div className="space-y-6">
          {runSegments.length >= 4 && (
            <CyclingRetentionPlot
              segments={runSegments}
              massMg={massMg}
              areaCm2={areaCm2}
              title={`${experiment.name} — ${selectedRun.original_filename} (Retention)`}
            />
          )}
          <GCDPlot
            segments={runSegments}
            massMg={massMg}
            areaCm2={areaCm2}
            referenceElectrode={refElectrode}
            title={`${experiment.name} — ${selectedRun.original_filename}`}
          />
        </div>
      );
    }
    if (["PEIS", "SPEIS"].includes(selectedRun.technique)) {
      return (
        <div className="space-y-6">
          <NyquistPlot
            segments={runSegments}
            areaCm2={areaCm2}
            title={`${experiment.name} — Nyquist`}
          />
          <BodePlot
            segments={runSegments}
            title={`${experiment.name} — Bode`}
          />
        </div>
      );
    }
    return null;
  };

  const renderAnalysis = () => {
    if (!selectedRunId || !selectedRun) {
      return (
        <div className="text-sm text-ink-muted text-center py-10">
          Select a run from the list to view analyses.
        </div>
      );
    }
    if (selectedRun.parse_status !== "parsed") {
      return (
        <div className="text-sm text-ink-muted text-center py-10">
          Run must be fully parsed before analysis.
        </div>
      );
    }

    const tech = selectedRun.technique;
    const scanRate = selectedRun.scan_rate_mv_s;

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {tech === "CV" && (
          <CVAnalysisCard
            runId={selectedRunId}
            massMg={massMg}
            areaCm2={areaCm2}
            scanRateMvS={scanRate || undefined}
          />
        )}
        {["GCPL", "CYCLING"].includes(tech) && (
          <GCDAnalysisCard
            runId={selectedRunId}
            massMg={massMg}
            areaCm2={areaCm2}
          />
        )}
        {["PEIS", "SPEIS"].includes(tech) && (
          <PEISAnalysisCard runId={selectedRunId} areaCm2={areaCm2} />
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full min-h-screen">
      {/* Page Header */}
      <header className="sticky top-0 z-10 bg-canvas/90 backdrop-blur-sm border-b border-border px-6 py-3 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-base font-semibold text-ink truncate">{experiment.name}</h1>
          {experiment.sample_label && (
            <span className="text-xs font-mono text-ink-muted">{experiment.sample_label}</span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Export controls */}
          {hasParsedRuns && selectedRunId && (
            <div className="flex items-center gap-1.5 border border-border rounded overflow-hidden">
              <select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value as any)}
                className="px-2 py-1.5 text-xs bg-surface text-ink-muted border-r border-border focus:outline-none"
              >
                <option value="png">PNG</option>
                <option value="svg">SVG</option>
                <option value="pdf">PDF</option>
              </select>
              <select
                value={exportTemplate}
                onChange={(e) => setExportTemplate(e.target.value as any)}
                className="px-2 py-1.5 text-xs bg-surface text-ink-muted border-r border-border focus:outline-none"
              >
                <option value="nature">Nature Style</option>
                <option value="acs">ACS Style</option>
                <option value="default">Default</option>
              </select>
              <a
                href={api.getExportUrl(selectedRunId, exportFormat, exportTemplate)}
                download
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs bg-surface hover:bg-surface-sunken text-ink-muted hover:text-ink transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Export
              </a>
            </div>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowParamsModal(true)}
            className="gap-1.5 text-xs h-8"
          >
            <Sliders className="w-3.5 h-3.5" />
            Parameters
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowUploadModal(true)}
            className="gap-1.5 text-xs h-8"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            Upload .mpr
          </Button>
        </div>
      </header>

      <div className="flex-1 px-6 py-5 space-y-4">
        {/* Sample parameters bar */}
        <SampleParametersBar
          experiment={experiment}
          onOpenEdit={() => setShowParamsModal(true)}
        />

        {/* Runs list */}
        {experiment.technique_runs.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between py-2.5 px-4">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                Technique Runs ({experiment.technique_runs.length})
              </CardTitle>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-ink-muted">View:</span>
                <div className="inline-flex rounded border border-border overflow-hidden">
                  <button
                    onClick={() => setPlotMode("overlay")}
                    className={`px-2.5 py-1 text-[10px] transition-colors ${plotMode === "overlay" ? "bg-[#8FAADC]/15 text-ink font-medium" : "text-ink-muted hover:bg-surface-sunken"}`}
                  >
                    Overlay All
                  </button>
                  <button
                    onClick={() => setPlotMode("single")}
                    className={`px-2.5 py-1 text-[10px] transition-colors ${plotMode === "single" ? "bg-[#8FAADC]/15 text-ink font-medium" : "text-ink-muted hover:bg-surface-sunken"}`}
                  >
                    Single Run
                  </button>
                </div>
              </div>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-surface-sunken">
                    <th className="text-left px-4 py-2 font-medium text-ink-muted">File</th>
                    <th className="text-left px-3 py-2 font-medium text-ink-muted">Technique</th>
                    <th className="text-left px-3 py-2 font-medium text-ink-muted">Scan Rate</th>
                    <th className="text-left px-3 py-2 font-medium text-ink-muted">Status</th>
                    <th className="text-left px-3 py-2 font-medium text-ink-muted">Uploaded</th>
                  </tr>
                </thead>
                <tbody>
                  {experiment.technique_runs.map((run) => {
                    const isSelected = run.id === selectedRunId;
                    return (
                      <tr
                        key={run.id}
                        onClick={() => {
                          if (run.parse_status === "parsed") {
                            setSelectedRunId(run.id);
                            setPlotMode("single");
                          }
                        }}
                        className={`border-b border-border/50 transition-colors ${
                          run.parse_status === "parsed" ? "cursor-pointer hover:bg-surface-sunken" : ""
                        } ${isSelected ? "bg-[#8FAADC]/8" : ""}`}
                      >
                        <td className="px-4 py-2.5 font-mono text-ink max-w-[240px] truncate">
                          {run.original_filename}
                        </td>
                        <td className="px-3 py-2.5">
                          <Badge variant="neutral">{run.technique}</Badge>
                        </td>
                        <td className="px-3 py-2.5 font-mono text-ink-muted">
                          {run.scan_rate_mv_s ? `${run.scan_rate_mv_s} mV/s` : "—"}
                        </td>
                        <td className="px-3 py-2.5">{parseStatusBadge(run.parse_status)}</td>
                        <td className="px-3 py-2.5 text-ink-muted">
                          {new Date(run.created_at).toLocaleString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Main content tabs */}
        {hasParsedRuns ? (
          <div className="space-y-4">
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              tabs={[
                { value: "plot", label: "Plot View" },
                { value: "analysis", label: "Analyses" },
              ]}
            />

            {activeTab === "plot" && (
              <div className="min-h-[500px]">
                {renderPlot()}
              </div>
            )}

            {activeTab === "analysis" && (
              <div className="pb-6">
                {renderAnalysis()}
              </div>
            )}
          </div>
        ) : experiment.technique_runs.length > 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-[#8FAADC] mb-3" />
            <p className="text-sm text-ink-muted">Parsing uploaded files...</p>
            <p className="text-xs text-ink-muted mt-1">This page will update automatically.</p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <UploadCloud className="w-10 h-10 text-border mb-4" />
            <p className="text-sm text-ink font-medium mb-1">No files uploaded yet</p>
            <p className="text-xs text-ink-muted mb-4">
              Upload your Bio-Logic .mpr exports to start plotting and analysis.
            </p>
            <Button
              variant="primary"
              size="md"
              onClick={() => setShowUploadModal(true)}
              className="gap-2"
            >
              <UploadCloud className="w-4 h-4" />
              Upload .mpr Files
            </Button>
          </div>
        )}
      </div>

      {/* Modals */}
      {showParamsModal && (
        <SampleParametersModal
          isOpen={showParamsModal}
          onClose={() => setShowParamsModal(false)}
          experiment={experiment}
          onSaved={(updated) => {
            setExperiment(updated);
          }}
        />
      )}

      {showUploadModal && (
        <MPRUploadModal
          isOpen={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          experiment={experiment}
          onUploadSuccess={() => {
            fetchExperiment();
            fetchOverlay();
          }}
        />
      )}
    </div>
  );
}
