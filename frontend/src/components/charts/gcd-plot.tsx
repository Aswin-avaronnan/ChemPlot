"use client";

import * as React from "react";
import { PlotContainer } from "./plot-container";
import { Segment } from "@/lib/api-client";
import { PlotStyleConfig, PRESETS, getPaletteColor, applyStyleToPlotlyLayout } from "@/lib/plot-style";

interface GCDPlotProps {
  segments?: Segment[];
  massMg?: number;
  areaCm2?: number;
  title?: string;
  referenceElectrode?: string;
  styleConfig?: PlotStyleConfig;
  plotId?: string;
}

export function GCDPlot({
  segments = [],
  massMg,
  areaCm2,
  title,
  referenceElectrode = "Ref",
  styleConfig = PRESETS.acs,
  plotId = "gcd-plot-view",
}: GCDPlotProps) {
  const [xAxisMode, setXAxisMode] = React.useState<"time" | "capacity">("capacity");
  const [showMode, setShowMode] = React.useState<"all" | "discharge_only">("all");

  const hasMass = massMg !== undefined && massMg !== null && massMg > 0;

  const strokeWidth = styleConfig.strokeWidth || 2.2;
  const isMarkerOpen = styleConfig.markerStyle === "circle-open";
  const isMarkerFilled = styleConfig.markerStyle === "circle-filled";
  const traceMode = isMarkerOpen || isMarkerFilled ? "lines+markers" : "lines";

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

      const color = getPaletteColor(styleConfig.paletteId, idx);
      const label = `Half-cycle ${seg.segment_index} (${mode})`;

      const markerConfig: any =
        traceMode === "lines+markers"
          ? {
              symbol: isMarkerOpen ? "circle-open" : "circle",
              size: styleConfig.markerSize || 5,
              color: color,
            }
            : undefined;

      traces.push({
        x: xVals,
        y: v,
        type: "scatter",
        mode: traceMode as any,
        name: label,
        line: {
          color: color,
          width: strokeWidth,
        },
        marker: markerConfig,
        hovertemplate: `<b>${label}</b><br>X: %{x:.2f}<br>E: %{y:.4f} V<extra></extra>`,
      });
    });

    return traces;
  }, [segments, xAxisMode, showMode, hasMass, massMg, styleConfig, strokeWidth, traceMode, isMarkerOpen]);

  const defaultXLabel = React.useMemo(() => {
    if (xAxisMode === "time") return "Time (s)";
    return hasMass ? "Specific capacity (mAh g⁻¹)" : "Capacity (mAh)";
  }, [xAxisMode, hasMass]);

  const defaultYLabel = `Potential (V vs ${referenceElectrode})`;

  const styledLayout = React.useMemo(() => {
    return applyStyleToPlotlyLayout(
      {},
      styleConfig,
      defaultXLabel,
      defaultYLabel,
      title
    );
  }, [styleConfig, defaultXLabel, defaultYLabel, title]);

  return (
    <div className="flex flex-col h-full space-y-3">
      {/* Chart toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-medium text-ink-muted">X-Axis:</span>
          <div className="inline-flex rounded border border-border p-0.5 bg-surface-sunken">
            <button
              onClick={() => setXAxisMode("capacity")}
              className={`px-2.5 py-1 text-xs rounded transition-colors ${
                xAxisMode === "capacity"
                  ? "bg-surface text-ink font-medium shadow-xs"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              Capacity ({hasMass ? "mAh g⁻¹" : "mAh"})
            </button>
            <button
              onClick={() => setXAxisMode("time")}
              className={`px-2.5 py-1 text-xs rounded transition-colors ${
                xAxisMode === "time" ? "bg-surface text-ink font-medium shadow-xs" : "text-ink-muted hover:text-ink"
              }`}
            >
              Time (s)
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
      <div className="w-full flex-1 min-h-[440px] bg-surface border border-border rounded-lg p-2.5 flex items-center justify-center">
        <PlotContainer
          plotId={plotId}
          data={plotData}
          layout={styledLayout}
          aspectRatio={styleConfig.aspectRatio}
        />
      </div>
    </div>
  );
}
