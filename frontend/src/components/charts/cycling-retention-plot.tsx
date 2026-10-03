"use client";

import * as React from "react";
import { PlotContainer } from "./plot-container";
import { Segment } from "@/lib/api-client";
import { getSeriesColor } from "@/lib/palette";

interface CyclingRetentionPlotProps {
  /** All GCPL/CYCLING segments from one or more runs */
  segments?: Segment[];
  massMg?: number;
  areaCm2?: number;
  title?: string;
  /** Applied current in Amperes (used to label x-axis if charge rate known) */
  appliedCurrentA?: number;
}

/**
 * Capacity vs. cycle-number chart (capacity fade / cycling stability).
 *
 * Segments are expected to alternate charge / discharge half-cycles.
 * We pair them up by half-cycle index (0=charge, 1=discharge, 2=charge, …)
 * and plot:
 *   - discharge capacity (mAh or mAh/g if mass provided)
 *   - coulombic efficiency (%) on a secondary y-axis
 *
 * This is the "cycling retention" view mandated by the spec (§2 core plots:
 * "cycling retention").
 */
export function CyclingRetentionPlot({
  segments = [],
  massMg,
  areaCm2,
  title,
  appliedCurrentA,
}: CyclingRetentionPlotProps) {
  const hasMass = massMg !== undefined && massMg !== null && massMg > 0;
  const massG = hasMass ? (massMg || 1) / 1000.0 : 1;

  const [yMode, setYMode] = React.useState<"capacity" | "capacitance">(
    "capacity"
  );

  // Build per-full-cycle stats from alternating charge/discharge half-cycles.
  const cycleStats = React.useMemo(() => {
    // Group segments into pairs: even index = charge, odd = discharge
    // (or detect via data.mode field if present)
    const discharge: Segment[] = [];
    const charge: Segment[] = [];

    segments.forEach((seg) => {
      const mode = seg.data?.mode as string | undefined;
      if (mode === "discharge") {
        discharge.push(seg);
      } else if (mode === "charge") {
        charge.push(seg);
      } else {
        // Fallback: even half-cycle index = charge, odd = discharge
        if (seg.segment_index % 2 === 0) {
          charge.push(seg);
        } else {
          discharge.push(seg);
        }
      }
    });

    // Build per-cycle stats, using discharge segments as the primary series
    return discharge.map((disSeg, cycleIdx) => {
      const chSeg = charge[cycleIdx];

      // Discharge capacity: prefer q_cd_mah, else integrate I*dt
      let qDis = 0;
      if (disSeg.data?.q_cd_mah && disSeg.data.q_cd_mah.length > 0) {
        const arr = disSeg.data.q_cd_mah as number[];
        qDis = Math.abs(arr[arr.length - 1] - arr[0]);
      } else if (
        disSeg.data?.capacity_mah &&
        disSeg.data.capacity_mah.length > 0
      ) {
        const arr = disSeg.data.capacity_mah as number[];
        qDis = Math.abs(arr[arr.length - 1] - arr[0]);
      } else if (disSeg.data?.time_s && disSeg.data?.current_ma) {
        const t = disSeg.data.time_s as number[];
        const i = disSeg.data.current_ma as number[];
        const dt = t.length > 1 ? t[t.length - 1] - t[0] : 0;
        const iMean = i.reduce((s: number, v: number) => s + Math.abs(v), 0) / (i.length || 1);
        qDis = (iMean * dt) / 3600; // mAh
      }

      let qCh = qDis; // fallback: assume 100% CE if no charge data
      if (chSeg) {
        if (chSeg.data?.q_cd_mah && chSeg.data.q_cd_mah.length > 0) {
          const arr = chSeg.data.q_cd_mah as number[];
          qCh = Math.abs(arr[arr.length - 1] - arr[0]);
        } else if (
          chSeg.data?.capacity_mah &&
          chSeg.data.capacity_mah.length > 0
        ) {
          const arr = chSeg.data.capacity_mah as number[];
          qCh = Math.abs(arr[arr.length - 1] - arr[0]);
        }
      }

      const coulombicEfficiency =
        qCh > 0 ? Math.min((qDis / qCh) * 100, 100) : 100;

      // Specific capacity mAh/g if mass available
      const specificCapacity = hasMass ? qDis / massG : qDis;

      // Specific capacitance F/g: C = I*Δt/(m*ΔV)
      let specificCapacitance: number | null = null;
      const iA =
        disSeg.applied_current_a || appliedCurrentA || 0;
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
        name: yMode === "capacity"
          ? hasMass
            ? "Specific Capacity (mAh/g)"
            : "Discharge Capacity (mAh)"
          : "Specific Capacitance (F/g)",
        marker: { size: 5, color: getSeriesColor(0) },
        line: { color: getSeriesColor(0), width: 1.8 },
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
        marker: { size: 4, color: getSeriesColor(2), symbol: "square" },
        line: { color: getSeriesColor(2), width: 1.4, dash: "dot" },
        yaxis: "y2",
        hovertemplate: `Cycle %{x}<br>CE: %{y:.1f}%<extra></extra>`,
      },
    ];

    return traces;
  }, [cycleStats, yMode, hasMass]);

  const primaryYLabel =
    yMode === "capacity"
      ? hasMass
        ? "Specific Capacity (mAh·g⁻¹)"
        : "Discharge Capacity (mAh)"
      : "Specific Capacitance (F·g⁻¹)";

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
                  ? "bg-surface text-ink font-medium shadow-sm"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              {hasMass ? "mAh/g" : "Capacity (mAh)"}
            </button>
            <button
              onClick={() => setYMode("capacitance")}
              className={`px-2.5 py-1 text-xs rounded transition-colors ${
                yMode === "capacitance"
                  ? "bg-surface text-ink font-medium shadow-sm"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              F/g (Capacitance)
            </button>
          </div>
        </div>

        {/* Retention summary badge */}
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
      <div className="w-full flex-1 min-h-[440px] bg-surface border border-border rounded p-2">
        <PlotContainer
          data={plotData}
          layout={{
            title: title ? { text: title, font: { size: 13, color: "#262B3A" } } : undefined,
            xaxis: {
              title: { text: "Cycle Number", font: { size: 11, color: "#262B3A" } },
              zeroline: false,
            },
            yaxis: {
              title: { text: primaryYLabel, font: { size: 11, color: "#262B3A" } },
              zeroline: false,
            },
            yaxis2: {
              title: { text: "Coulombic Efficiency (%)", font: { size: 11, color: "#009E73" } },
              overlaying: "y",
              side: "right",
              range: [0, 105],
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
