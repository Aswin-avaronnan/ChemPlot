"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import type { PlotParams } from "react-plotly.js";

// Dynamically import react-plotly.js with SSR disabled
const Plot = dynamic(() => import("react-plotly.js"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[400px] flex items-center justify-center bg-surface-sunken text-xs font-mono text-ink-muted">
      Rendering plot...
    </div>
  ),
});

export interface PlotContainerProps {
  data: any[];
  layout?: any;
  config?: any;
  className?: string;
  [key: string]: any;
}

export function PlotContainer({ className, layout, config, data, ...props }: PlotContainerProps) {
  const mergedLayout: Partial<Plotly.Layout> = {
    autosize: true,
    paper_bgcolor: "#FFFFFF",
    plot_bgcolor: "#FFFFFF",
    font: {
      family: "Inter, -apple-system, sans-serif",
      size: 11,
      color: "#262B3A",
    },
    margin: { l: 60, r: 25, t: 30, b: 50 },
    hovermode: "closest",
    xaxis: {
      gridcolor: "#EEF0F6",
      zerolinecolor: "#DDE1EA",
      tickfont: { family: "JetBrains Mono, monospace", size: 10, color: "#6B7280" },
      showline: true,
      linecolor: "#DDE1EA",
      ...layout?.xaxis,
    },
    yaxis: {
      gridcolor: "#EEF0F6",
      zerolinecolor: "#DDE1EA",
      tickfont: { family: "JetBrains Mono, monospace", size: 10, color: "#6B7280" },
      showline: true,
      linecolor: "#DDE1EA",
      ...layout?.yaxis,
    },
    ...layout,
  };

  const mergedConfig: Partial<Plotly.Config> = {
    responsive: true,
    displayModeBar: true,
    displaylogo: false,
    modeBarButtonsToRemove: ["lasso2d", "select2d"],
    toImageButtonOptions: {
      format: "png",
      filename: "chemplot_export",
      height: 700,
      width: 900,
      scale: 3,
    },
    ...config,
  };

  return (
    <div className={`w-full h-full min-h-[420px] ${className || ""}`}>
      <Plot data={data} layout={mergedLayout} config={mergedConfig} style={{ width: "100%", height: "100%" }} {...props} />
    </div>
  );
}
