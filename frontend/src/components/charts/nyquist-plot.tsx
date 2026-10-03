"use client";

import * as React from "react";
import { PlotContainer } from "./plot-container";
import { Segment } from "@/lib/api-client";
import { getSeriesColor } from "@/lib/palette";

interface NyquistPlotProps {
  segments?: Segment[];
  areaCm2?: number;
  title?: string;
  seriesResistanceRs?: number;
}

export function NyquistPlot({
  segments = [],
  areaCm2,
  title,
  seriesResistanceRs,
}: NyquistPlotProps) {
  const [normalizeArea, setNormalizeArea] = React.useState<boolean>(false);
  const hasArea = areaCm2 !== undefined && areaCm2 !== null && areaCm2 > 0;

  const multiplier = normalizeArea && hasArea ? areaCm2 : 1.0;

  const plotData: Plotly.Data[] = React.useMemo(() => {
    const traces: Plotly.Data[] = [];

    segments.forEach((seg, idx) => {
      const re: number[] = ((seg.data?.re_z_ohm || []) as number[]).map((v: number) => v * multiplier);
      const negIm: number[] = ((seg.data?.neg_im_z_ohm || []) as number[]).map((v: number) => v * multiplier);
      const freq: number[] = seg.data?.frequency_hz || [];

      // Custom text for tooltips with frequency
      const text = freq.map((f: number, i: number) => `f: ${f.toFixed(2)} Hz<br>Z': ${re[i]?.toFixed(2)}<br>-Z'': ${negIm[i]?.toFixed(2)}`);

      traces.push({
        x: re,
        y: negIm,
        type: "scatter",
        mode: "lines+markers",
        name: `EIS Sweep ${seg.segment_index}`,
        marker: {
          size: 5,
          color: getSeriesColor(idx),
        },
        line: {
          color: getSeriesColor(idx),
          width: 1.5,
        },
        text: text,
        hoverinfo: "text",
      });
    });

    // Mark series resistance Rs if provided
    if (seriesResistanceRs) {
      const rsVal = seriesResistanceRs * multiplier;
      traces.push({
        x: [rsVal],
        y: [0],
        type: "scatter",
        mode: "markers+text",
        name: `Rs = ${rsVal.toFixed(2)} ${normalizeArea ? "Ω·cm²" : "Ω"}`,
        text: ["Rs"],
        textposition: "top right",
        marker: {
          size: 10,
          color: "#E8A9A3",
          symbol: "cross",
        },
      });
    }

    return traces;
  }, [segments, multiplier, seriesResistanceRs, normalizeArea]);

  const unitStr = normalizeArea ? "Ω·cm²" : "Ω";

  return (
    <div className="flex flex-col h-full space-y-3">
      {/* Chart toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-medium text-ink-muted">Impedance Unit:</span>
          <div className="inline-flex rounded border border-border p-0.5 bg-surface-sunken">
            <button
              onClick={() => setNormalizeArea(false)}
              className={`px-2.5 py-1 text-xs rounded transition-colors ${
                !normalizeArea ? "bg-surface text-ink font-medium shadow-sm" : "text-ink-muted hover:text-ink"
              }`}
            >
              Raw (Ω)
            </button>
            <button
              onClick={() => setNormalizeArea(true)}
              disabled={!hasArea}
              title={!hasArea ? "Specify electrode area in sample parameters" : ""}
              className={`px-2.5 py-1 text-xs rounded transition-colors ${
                normalizeArea
                  ? "bg-surface text-ink font-medium shadow-sm"
                  : "text-ink-muted hover:text-ink disabled:opacity-40"
              }`}
            >
              Area-Normalized (Ω·cm²)
            </button>
          </div>
        </div>

        <div className="text-xs text-ink-muted font-mono">
          High frequency: left intercept (Rs)
        </div>
      </div>

      {/* Plot Canvas with 1:1 Aspect Ratio */}
      <div className="w-full flex-1 min-h-[440px] bg-surface border border-border rounded p-2">
        <PlotContainer
          data={plotData}
          layout={{
            title: title ? { text: title, font: { size: 13, color: "#262B3A" } } : undefined,
            xaxis: {
              title: { text: `Z' (${unitStr})`, font: { size: 11, color: "#262B3A" } },
              zeroline: true,
            },
            yaxis: {
              title: { text: `-Z'' (${unitStr})`, font: { size: 11, color: "#262B3A" } },
              scaleanchor: "x",
              scaleratio: 1,
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
