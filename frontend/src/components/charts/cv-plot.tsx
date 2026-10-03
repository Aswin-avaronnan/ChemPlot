"use client";

import * as React from "react";
import { PlotContainer } from "./plot-container";
import { Segment, OverlayRun } from "@/lib/api-client";
import { getSeriesColor } from "@/lib/palette";
import { Button } from "@/components/ui/button";

export type CurrentUnit = "raw" | "gravimetric" | "areal";

interface CVPlotProps {
  segments?: Segment[];
  overlayRuns?: OverlayRun[];
  massMg?: number;
  areaCm2?: number;
  title?: string;
  referenceElectrode?: string;
}

export function CVPlot({
  segments = [],
  overlayRuns = [],
  massMg,
  areaCm2,
  title,
  referenceElectrode = "Ref",
}: CVPlotProps) {
  const [unit, setUnit] = React.useState<CurrentUnit>("raw");
  const [selectedCycle, setSelectedCycle] = React.useState<string>("all");

  const hasMass = massMg !== undefined && massMg !== null && massMg > 0;
  const hasArea = areaCm2 !== undefined && areaCm2 !== null && areaCm2 > 0;

  // Determine available cycles if single run
  const availableCycles = React.useMemo(() => {
    if (segments.length > 0) {
      return Array.from(new Set(segments.map((s) => s.segment_index))).sort((a, b) => a - b);
    }
    return [];
  }, [segments]);

  // Construct Plotly Data Traces
  const plotData: Plotly.Data[] = React.useMemo(() => {
    const traces: Plotly.Data[] = [];

    // Helper to calculate Y values based on unit
    const calculateY = (rawMa: number[], m_mg?: number, a_cm2?: number) => {
      if (unit === "gravimetric") {
        const effectiveMassMg = m_mg || massMg;
        if (effectiveMassMg && effectiveMassMg > 0) {
          const massG = effectiveMassMg / 1000.0;
          return rawMa.map((i) => (i / 1000.0) / massG); // in A/g
        }
      } else if (unit === "areal") {
        const effectiveArea = a_cm2 || areaCm2 || 1.0;
        return rawMa.map((i) => i / effectiveArea); // in mA/cm²
      }
      return rawMa; // in mA
    };

    if (overlayRuns.length > 0) {
      // Multi-scan-rate overlay
      overlayRuns.forEach((run, rIdx) => {
        // Take last/stabilized cycle for each scan rate in overlay view
        const targetSeg = run.segments[run.segments.length - 1] || run.segments[0];
        if (!targetSeg || !targetSeg.data?.potential_v) return;

        const v = targetSeg.data.potential_v;
        const rawI = targetSeg.data.current_ma || [];
        const y = calculateY(rawI, run.mass_mg, run.area_cm2);

        const label = run.scan_rate_mv_s
          ? `${run.scan_rate_mv_s} mV/s (${run.filename.split("_")[0]})`
          : run.filename;

        traces.push({
          x: v,
          y: y,
          type: "scatter",
          mode: "lines",
          name: label,
          line: {
            color: getSeriesColor(rIdx),
            width: 1.8,
          },
          hovertemplate: `<b>${label}</b><br>E: %{x:.4f} V<br>I: %{y:.4f}<extra></extra>`,
        });
      });
    } else {
      // Single run with multiple cycles
      const filteredSegments =
        selectedCycle === "all"
          ? segments
          : segments.filter((s) => s.segment_index === parseInt(selectedCycle, 10));

      filteredSegments.forEach((seg, sIdx) => {
        if (!seg.data?.potential_v) return;
        const v = seg.data.potential_v;
        const rawI = seg.data.current_ma || [];
        const y = calculateY(rawI, massMg, areaCm2);

        const cycleLabel = `Cycle ${seg.segment_index}${
          seg.scan_rate_mv_s ? ` (${seg.scan_rate_mv_s} mV/s)` : ""
        }`;

        traces.push({
          x: v,
          y: y,
          type: "scatter",
          mode: "lines",
          name: cycleLabel,
          line: {
            color: getSeriesColor(seg.segment_index - 1),
            width: 1.6,
          },
          hovertemplate: `<b>${cycleLabel}</b><br>E: %{x:.4f} V<br>I: %{y:.4f}<extra></extra>`,
        });
      });
    }

    return traces;
  }, [segments, overlayRuns, unit, selectedCycle, massMg, areaCm2]);

  const yAxisLabel = React.useMemo(() => {
    switch (unit) {
      case "gravimetric":
        return "Specific Current (A·g⁻¹)";
      case "areal":
        return "Current Density (mA·cm⁻²)";
      case "raw":
      default:
        return "Current (mA)";
    }
  }, [unit]);

  return (
    <div className="flex flex-col h-full space-y-3">
      {/* Chart toolbar controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-medium text-ink-muted">Normalize:</span>
          <div className="inline-flex rounded border border-border p-0.5 bg-surface-sunken">
            <button
              onClick={() => setUnit("raw")}
              className={`px-2.5 py-1 text-xs rounded transition-colors ${
                unit === "raw" ? "bg-surface text-ink font-medium shadow-sm" : "text-ink-muted hover:text-ink"
              }`}
            >
              Raw (mA)
            </button>
            <button
              onClick={() => setUnit("gravimetric")}
              disabled={!hasMass}
              title={!hasMass ? "Specify active mass in sample parameters first" : ""}
              className={`px-2.5 py-1 text-xs rounded transition-colors ${
                unit === "gravimetric"
                  ? "bg-surface text-ink font-medium shadow-sm"
                  : "text-ink-muted hover:text-ink disabled:opacity-40"
              }`}
            >
              A/g (Mass)
            </button>
            <button
              onClick={() => setUnit("areal")}
              className={`px-2.5 py-1 text-xs rounded transition-colors ${
                unit === "areal"
                  ? "bg-surface text-ink font-medium shadow-sm"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              mA/cm² (Area)
            </button>
          </div>
        </div>

        {/* Cycle filter dropdown if single run */}
        {overlayRuns.length === 0 && availableCycles.length > 1 && (
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-ink-muted">Cycles:</span>
            <select
              value={selectedCycle}
              onChange={(e) => setSelectedCycle(e.target.value)}
              className="px-2 py-1 text-xs bg-surface text-ink border border-border rounded focus:outline-none"
            >
              <option value="all">All Cycles ({availableCycles.length})</option>
              {availableCycles.map((c) => (
                <option key={c} value={String(c)}>
                  Cycle {c}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Plot Canvas */}
      <div className="w-full flex-1 min-h-[440px] bg-surface border border-border rounded p-2">
        <PlotContainer
          data={plotData}
          layout={{
            title: title ? { text: title, font: { size: 13, color: "#262B3A" } } : undefined,
            xaxis: {
              title: { text: `Potential vs ${referenceElectrode} (V)`, font: { size: 11, color: "#262B3A" } },
              zeroline: true,
            },
            yaxis: {
              title: { text: yAxisLabel, font: { size: 11, color: "#262B3A" } },
              zeroline: true,
            },
            showlegend: true,
            legend: {
              orientation: "h",
              y: -0.2,
              x: 0,
              font: { size: 10 },
            },
          }}
        />
      </div>
    </div>
  );
}
