"use client";

import * as React from "react";
import { PlotContainer } from "./plot-container";
import { Segment } from "@/lib/api-client";
import { PlotStyleConfig, PRESETS, getPaletteColor, applyStyleToPlotlyLayout } from "@/lib/plot-style";

interface BodePlotProps {
  segments?: Segment[];
  title?: string;
  styleConfig?: PlotStyleConfig;
  plotId?: string;
}

export function BodePlot({
  segments = [],
  title,
  styleConfig = PRESETS.acs,
  plotId = "bode-plot-view",
}: BodePlotProps) {
  const [displayMode, setDisplayMode] = React.useState<"both" | "magnitude" | "phase">("both");

  const strokeWidth = styleConfig.strokeWidth || 2.2;
  const isMarkerOpen = styleConfig.markerStyle === "circle-open";
  const color1 = getPaletteColor(styleConfig.paletteId, 0);
  const color2 = getPaletteColor(styleConfig.paletteId, 1);

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
          marker: {
            symbol: isMarkerOpen ? "circle-open" : "circle",
            size: styleConfig.markerSize || 4,
            color: color1,
          },
          line: { color: color1, width: strokeWidth },
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
          marker: {
            symbol: isMarkerOpen ? "square-open" : "square",
            size: Math.max((styleConfig.markerSize || 4) - 1, 3),
            color: color2,
          },
          line: { color: color2, width: strokeWidth, dash: "dot" },
          yaxis: displayMode === "both" ? "y2" : "y1",
          hovertemplate: `f: %{x:.2e} Hz<br>Phase: %{y:.2f}°<extra></extra>`,
        });
      }
    });

    return traces;
  }, [segments, displayMode, color1, color2, strokeWidth, isMarkerOpen, styleConfig.markerSize]);

  const styledLayout = React.useMemo(() => {
    const y1Title = displayMode !== "phase" ? "|Z| (Ω)" : "Phase Angle (°)";
    const base = applyStyleToPlotlyLayout(
      {},
      styleConfig,
      "Frequency (Hz)",
      y1Title,
      title
    );

    const tickVal = styleConfig.tickDirection === "none" ? "" : styleConfig.tickDirection;

    return {
      ...base,
      xaxis: {
        ...base.xaxis,
        type: "log",
      },
      yaxis: {
        ...base.yaxis,
        type: displayMode !== "phase" ? "log" : "linear",
      },
      yaxis2:
        displayMode === "both"
          ? {
              title: {
                text: "Phase Angle (°)",
                font: {
                  family: styleConfig.fontFamily,
                  size: styleConfig.axisLabelFontSize,
                  color: color2,
                  weight: styleConfig.isBoldLabels ? "bold" : "normal",
                },
              },
              tickfont: {
                family: styleConfig.fontFamily,
                size: styleConfig.tickFontSize,
                color: color2,
              },
              showline: true,
              linecolor: styleConfig.axisColor,
              linewidth: styleConfig.axisLineWidth,
              ticks: tickVal,
              ticklen: styleConfig.tickLength,
              tickwidth: styleConfig.axisLineWidth,
              tickcolor: styleConfig.axisColor,
              overlaying: "y",
              side: "right",
              showgrid: false,
              zeroline: false,
            }
          : undefined,
    };
  }, [styleConfig, displayMode, color2, title]);

  return (
    <div className="flex flex-col h-full space-y-3">
      {/* Chart toolbar */}
      <div className="flex items-center gap-1.5 px-1">
        <span className="text-[11px] font-medium text-ink-muted">View:</span>
        <div className="inline-flex rounded border border-border p-0.5 bg-surface-sunken">
          <button
            onClick={() => setDisplayMode("both")}
            className={`px-2.5 py-1 text-xs rounded transition-colors ${
              displayMode === "both" ? "bg-surface text-ink font-medium shadow-xs" : "text-ink-muted hover:text-ink"
            }`}
          >
            Dual (|Z| & Phase)
          </button>
          <button
            onClick={() => setDisplayMode("magnitude")}
            className={`px-2.5 py-1 text-xs rounded transition-colors ${
              displayMode === "magnitude" ? "bg-surface text-ink font-medium shadow-xs" : "text-ink-muted hover:text-ink"
            }`}
          >
            |Z| Only
          </button>
          <button
            onClick={() => setDisplayMode("phase")}
            className={`px-2.5 py-1 text-xs rounded transition-colors ${
              displayMode === "phase" ? "bg-surface text-ink font-medium shadow-xs" : "text-ink-muted hover:text-ink"
            }`}
          >
            Phase Only
          </button>
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
