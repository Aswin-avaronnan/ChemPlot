"use client";

import * as React from "react";
import { PlotContainer } from "./plot-container";
import { Segment } from "@/lib/api-client";
import { getSeriesColor } from "@/lib/palette";

interface GCDPlotProps {
  segments?: Segment[];
  massMg?: number;
  areaCm2?: number;
  title?: string;
  referenceElectrode?: string;
}

export function GCDPlot({
  segments = [],
  massMg,
  areaCm2,
  title,
  referenceElectrode = "Ref",
}: GCDPlotProps) {
  const [xAxisMode, setXAxisMode] = React.useState<"time" | "capacity">("time");
  const [showMode, setShowMode] = React.useState<"all" | "discharge_only">("all");

  const hasMass = massMg !== undefined && massMg !== null && massMg > 0;

  const plotData: Plotly.Data[] = React.useMemo(() => {
    const traces: Plotly.Data[] = [];

    const massG = hasMass ? (massMg || 1) / 1000.0 : 1;

    segments.forEach((seg, idx) => {
      const mode = seg.data?.mode || (idx % 2 === 0 ? "charge" : "discharge");
      if (showMode === "discharge_only" && mode === "charge") return;

      const v: number[] = seg.data?.potential_v || [];
      const t: number[] = seg.data?.time_s || [];
      const q: number[] = seg.data?.capacity_mah || seg.data?.q_cd_mah || [];

      let xVals = t;
      if (xAxisMode === "capacity") {
        if (q.length === v.length && hasMass) {
          xVals = q.map((val: number) => Math.abs(val) / massG); // in mAh/g
        } else if (q.length === v.length) {
          xVals = q.map((val: number) => Math.abs(val)); // in mAh
        }
      }

      const label = `Half-cycle ${seg.segment_index} (${mode})`;

      traces.push({
        x: xVals,
        y: v,
        type: "scatter",
        mode: "lines",
        name: label,
        line: {
          color: getSeriesColor(seg.segment_index),
          width: 1.6,
        },
        hovertemplate: `<b>${label}</b><br>X: %{x:.2f}<br>E: %{y:.4f} V<extra></extra>`,
      });
    });

    return traces;
  }, [segments, xAxisMode, showMode, hasMass, massMg]);

  const xAxisLabel = React.useMemo(() => {
    if (xAxisMode === "time") return "Time (s)";
    return hasMass ? "Specific Capacity (mAh·g⁻¹)" : "Capacity (mAh)";
  }, [xAxisMode, hasMass]);

  return (
    <div className="flex flex-col h-full space-y-3">
      {/* Chart toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-medium text-ink-muted">X-Axis:</span>
          <div className="inline-flex rounded border border-border p-0.5 bg-surface-sunken">
            <button
              onClick={() => setXAxisMode("time")}
              className={`px-2.5 py-1 text-xs rounded transition-colors ${
                xAxisMode === "time" ? "bg-surface text-ink font-medium shadow-sm" : "text-ink-muted hover:text-ink"
              }`}
            >
              Time (s)
            </button>
            <button
              onClick={() => setXAxisMode("capacity")}
              className={`px-2.5 py-1 text-xs rounded transition-colors ${
                xAxisMode === "capacity"
                  ? "bg-surface text-ink font-medium shadow-sm"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              Capacity ({hasMass ? "mAh/g" : "mAh"})
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-ink-muted">Filter:</span>
          <select
            value={showMode}
            onChange={(e) => setShowMode(e.target.value as any)}
            className="px-2 py-1 text-xs bg-surface text-ink border border-border rounded focus:outline-none"
          >
            <option value="all">Full Profile (Charge + Discharge)</option>
            <option value="discharge_only">Discharge Half-Cycles Only</option>
          </select>
        </div>
      </div>

      {/* Plot Canvas */}
      <div className="w-full flex-1 min-h-[440px] bg-surface border border-border rounded p-2">
        <PlotContainer
          data={plotData}
          layout={{
            title: title ? { text: title, font: { size: 13, color: "#262B3A" } } : undefined,
            xaxis: {
              title: { text: xAxisLabel, font: { size: 11, color: "#262B3A" } },
              zeroline: false,
            },
            yaxis: {
              title: { text: `Potential vs ${referenceElectrode} (V)`, font: { size: 11, color: "#262B3A" } },
              zeroline: false,
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
