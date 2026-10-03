"use client";

import * as React from "react";
import { PlotContainer } from "./plot-container";
import { Segment } from "@/lib/api-client";

interface BodePlotProps {
  segments?: Segment[];
  title?: string;
}

export function BodePlot({ segments = [], title }: BodePlotProps) {
  const [displayMode, setDisplayMode] = React.useState<"both" | "magnitude" | "phase">("both");

  const plotData: Plotly.Data[] = React.useMemo(() => {
    const traces: Plotly.Data[] = [];

    segments.forEach((seg) => {
      const freq = seg.data?.frequency_hz || [];
      const mag = seg.data?.mag_z_ohm || [];
      const phase = seg.data?.phase_deg || [];

      if (displayMode === "both" || displayMode === "magnitude") {
        traces.push({
          x: freq,
          y: mag,
          type: "scatter",
          mode: "lines+markers",
          name: "|Z| (Magnitude)",
          marker: { size: 4, color: "#0072B2" },
          line: { color: "#0072B2", width: 1.5 },
          yaxis: "y1",
          hovertemplate: `f: %{x:.2e} Hz<br>|Z|: %{y:.2f} Ω<extra></extra>`,
        });
      }

      if (displayMode === "both" || displayMode === "phase") {
        traces.push({
          x: freq,
          y: phase,
          type: "scatter",
          mode: "lines+markers",
          name: "Phase Angle (°)",
          marker: { size: 4, color: "#D55E00" },
          line: { color: "#D55E00", width: 1.5, dash: "dot" },
          yaxis: displayMode === "both" ? "y2" : "y1",
          hovertemplate: `f: %{x:.2e} Hz<br>Phase: %{y:.2f}°<extra></extra>`,
        });
      }
    });

    return traces;
  }, [segments, displayMode]);

  return (
    <div className="flex flex-col h-full space-y-3">
      {/* Chart toolbar */}
      <div className="flex items-center gap-1.5 px-1">
        <span className="text-[11px] font-medium text-ink-muted">View:</span>
        <div className="inline-flex rounded border border-border p-0.5 bg-surface-sunken">
          <button
            onClick={() => setDisplayMode("both")}
            className={`px-2.5 py-1 text-xs rounded transition-colors ${
              displayMode === "both" ? "bg-surface text-ink font-medium shadow-sm" : "text-ink-muted hover:text-ink"
            }`}
          >
            Dual (|Z| & Phase)
          </button>
          <button
            onClick={() => setDisplayMode("magnitude")}
            className={`px-2.5 py-1 text-xs rounded transition-colors ${
              displayMode === "magnitude" ? "bg-surface text-ink font-medium shadow-sm" : "text-ink-muted hover:text-ink"
            }`}
          >
            |Z| Only
          </button>
          <button
            onClick={() => setDisplayMode("phase")}
            className={`px-2.5 py-1 text-xs rounded transition-colors ${
              displayMode === "phase" ? "bg-surface text-ink font-medium shadow-sm" : "text-ink-muted hover:text-ink"
            }`}
          >
            Phase Only
          </button>
        </div>
      </div>

      {/* Plot Canvas */}
      <div className="w-full flex-1 min-h-[440px] bg-surface border border-border rounded p-2">
        <PlotContainer
          data={plotData}
          layout={{
            title: title ? { text: title, font: { size: 13, color: "#262B3A" } } : undefined,
            xaxis: {
              type: "log",
              title: { text: "Frequency (Hz)", font: { size: 11, color: "#262B3A" } },
            },
            yaxis: {
              type: displayMode !== "phase" ? "log" : "linear",
              title: {
                text: displayMode !== "phase" ? "|Z| (Ω)" : "Phase Angle (°)",
                font: { size: 11, color: "#0072B2" },
              },
            },
            yaxis2:
              displayMode === "both"
                ? {
                    title: { text: "Phase Angle (°)", font: { size: 11, color: "#D55E00" } },
                    overlaying: "y",
                    side: "right",
                  }
                : undefined,
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
