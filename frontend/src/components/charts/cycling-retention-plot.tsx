"use client";

import * as React from "react";
import { PlotContainer } from "./plot-container";
import { Segment } from "@/lib/api-client";
import { PlotStyleConfig, PRESETS, getPaletteColor, applyStyleToPlotlyLayout } from "@/lib/plot-style";

interface CyclingRetentionPlotProps {
  segments?: Segment[];
  massMg?: number;
  areaCm2?: number;
  title?: string;
  appliedCurrentA?: number;
  styleConfig?: PlotStyleConfig;
  plotId?: string;
}

export function CyclingRetentionPlot({
  segments = [],
  massMg,
  areaCm2,
  title,
  appliedCurrentA,
  styleConfig = PRESETS.acs,
  plotId = "cycling-retention-plot-view",
}: CyclingRetentionPlotProps) {
  const hasMass = massMg !== undefined && massMg !== null && massMg > 0;
  const massG = hasMass ? (massMg || 1) / 1000.0 : 1;

  const [yMode, setYMode] = React.useState<"capacity" | "capacitance">("capacity");

  const strokeWidth = styleConfig.strokeWidth || 2.2;
  const isMarkerOpen = styleConfig.markerStyle === "circle-open";
  const isMarkerFilled = styleConfig.markerStyle === "circle-filled";

  // Build per-full-cycle stats
  const cycleStats = React.useMemo(() => {
    const discharge: Segment[] = [];
    const charge: Segment[] = [];

    segments.forEach((seg) => {
      const mode = seg.data?.mode as string | undefined;
      if (mode === "discharge") {
        discharge.push(seg);
      } else if (mode === "charge") {
        charge.push(seg);
      } else {
        if (seg.segment_index % 2 === 0) {
          charge.push(seg);
        } else {
          discharge.push(seg);
        }
      }
    });

    return discharge.map((disSeg, cycleIdx) => {
      const chSeg = charge[cycleIdx];

      let qDis = 0;
      if (disSeg.data?.q_cd_mah && disSeg.data.q_cd_mah.length > 0) {
        const arr = disSeg.data.q_cd_mah as number[];
        qDis = Math.abs(arr[arr.length - 1] - arr[0]);
      } else if (disSeg.data?.capacity_mah && disSeg.data.capacity_mah.length > 0) {
        const arr = disSeg.data.capacity_mah as number[];
        qDis = Math.abs(arr[arr.length - 1] - arr[0]);
      } else if (disSeg.data?.time_s && disSeg.data?.current_ma) {
        const t = disSeg.data.time_s as number[];
        const i = disSeg.data.current_ma as number[];
        const dt = t.length > 1 ? t[t.length - 1] - t[0] : 0;
        const iMean = i.reduce((s: number, v: number) => s + Math.abs(v), 0) / (i.length || 1);
        qDis = (iMean * dt) / 3600;
      }

      let qCh = qDis;
      if (chSeg) {
        if (chSeg.data?.q_cd_mah && chSeg.data.q_cd_mah.length > 0) {
          const arr = chSeg.data.q_cd_mah as number[];
          qCh = Math.abs(arr[arr.length - 1] - arr[0]);
        } else if (chSeg.data?.capacity_mah && chSeg.data.capacity_mah.length > 0) {
          const arr = chSeg.data.capacity_mah as number[];
          qCh = Math.abs(arr[arr.length - 1] - arr[0]);
        }
      }

      const coulombicEfficiency = qCh > 0 ? Math.min((qDis / qCh) * 100, 100) : 100;
      const specificCapacity = hasMass ? qDis / massG : qDis;

      let specificCapacitance: number | null = null;
      const iA = disSeg.applied_current_a || appliedCurrentA || 0;
      if (iA > 0 && disSeg.data?.time_s && disSeg.data?.potential_v) {
        const t = disSeg.data.time_s as number[];
        const v = disSeg.data.potential_v as number[];
        const dt = t.length > 1 ? t[t.length - 1] - t[0] : 0;
        const dv = Math.abs(v[0] - v[v.length - 1]);
        if (dv > 0.01) {
          const capF = (iA * dt) / dv;
          specificCapacitance = hasMass ? capF / massG : null;
        }
      }

      return {
        cycleNumber: cycleIdx + 1,
        dischargeCapacityMah: qDis,
        specificCapacity,
        specificCapacitance,
        coulombicEfficiency,
      };
    });
  }, [segments, hasMass, massG, appliedCurrentA]);

  const color1 = getPaletteColor(styleConfig.paletteId, 0);
  const color2 = getPaletteColor(styleConfig.paletteId, 1);

  const plotData: Plotly.Data[] = React.useMemo(() => {
    const cycleNums = cycleStats.map((s) => s.cycleNumber);

    const primaryY =
      yMode === "capacity"
        ? cycleStats.map((s) => s.specificCapacity)
        : cycleStats.map((s) => s.specificCapacitance ?? 0);

    const traces: Plotly.Data[] = [
      {
        x: cycleNums,
        y: primaryY,
        type: "scatter",
        mode: "lines+markers",
        name:
          yMode === "capacity"
            ? hasMass
              ? "Specific Capacity (mAh g⁻¹)"
              : "Discharge Capacity (mAh)"
            : "Specific Capacitance (F g⁻¹)",
        marker: {
          symbol: isMarkerOpen ? "circle-open" : "circle",
          size: styleConfig.markerSize || 5,
          color: color1,
        },
        line: { color: color1, width: strokeWidth },
        yaxis: "y1",
        hovertemplate:
          yMode === "capacity"
            ? `Cycle %{x}<br>${hasMass ? "Cs: %{y:.2f} mAh/g" : "Q: %{y:.3f} mAh"}<extra></extra>`
            : `Cycle %{x}<br>Cs: %{y:.2f} F/g<extra></extra>`,
      },
      {
        x: cycleNums,
        y: cycleStats.map((s) => s.coulombicEfficiency),
        type: "scatter",
        mode: "lines+markers",
        name: "Coulombic Efficiency (%)",
        marker: {
          symbol: isMarkerOpen ? "square-open" : "square",
          size: Math.max(styleConfig.markerSize - 1, 4),
          color: color2,
        },
        line: { color: color2, width: Math.max(strokeWidth - 0.6, 1.4), dash: "dot" },
        yaxis: "y2",
        hovertemplate: `Cycle %{x}<br>CE: %{y:.1f}%<extra></extra>`,
      },
    ];

    return traces;
  }, [cycleStats, yMode, hasMass, color1, color2, strokeWidth, isMarkerOpen, styleConfig.markerSize]);

  const defaultYLabel =
    yMode === "capacity"
      ? hasMass
        ? "Specific Capacity (mAh g⁻¹)"
        : "Discharge Capacity (mAh)"
      : "Specific Capacitance (F g⁻¹)";

  const styledLayout = React.useMemo(() => {
    const base = applyStyleToPlotlyLayout(
      {},
      styleConfig,
      "Cycle Number",
      defaultYLabel,
      title
    );

    const tickVal = styleConfig.tickDirection === "none" ? "" : styleConfig.tickDirection;

    return {
      ...base,
      yaxis2: {
        title: {
          text: "Coulombic Efficiency (%)",
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
        range: [0, 105],
        showgrid: false,
        zeroline: false,
      },
    };
  }, [styleConfig, defaultYLabel, title, color2]);

  if (cycleStats.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[200px] text-sm text-ink-muted">
        No cycling data found. Ensure the run has paired charge/discharge half-cycles.
      </div>
    );
  }

  const retentionPct =
    cycleStats.length > 1
      ? ((cycleStats[cycleStats.length - 1].specificCapacity /
          cycleStats[0].specificCapacity) *
          100
        ).toFixed(1)
      : null;

  return (
    <div className="flex flex-col h-full space-y-3">
      {/* Chart toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-medium text-ink-muted">Y-Axis:</span>
          <div className="inline-flex rounded border border-border p-0.5 bg-surface-sunken">
            <button
              onClick={() => setYMode("capacity")}
              className={`px-2.5 py-1 text-xs rounded transition-colors ${
                yMode === "capacity"
                  ? "bg-surface text-ink font-medium shadow-xs"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              {hasMass ? "mAh g⁻¹" : "Capacity (mAh)"}
            </button>
            <button
              onClick={() => setYMode("capacitance")}
              className={`px-2.5 py-1 text-xs rounded transition-colors ${
                yMode === "capacitance"
                  ? "bg-surface text-ink font-medium shadow-xs"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              F g⁻¹ (Capacitance)
            </button>
          </div>
        </div>

        {retentionPct && (
          <div className="text-xs font-mono text-ink-muted">
            Retention after {cycleStats.length} cycles:{" "}
            <span
              className={`font-semibold ${
                parseFloat(retentionPct) >= 80
                  ? "text-[#1F543F]"
                  : parseFloat(retentionPct) >= 60
                  ? "text-[#6B4715]"
                  : "text-[#692923]"
              }`}
            >
              {retentionPct}%
            </span>
          </div>
        )}
      </div>

      {/* Plot canvas */}
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
