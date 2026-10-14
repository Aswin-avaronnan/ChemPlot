"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { AspectRatioMode } from "@/lib/plot-style";

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
  plotId?: string;
  aspectRatio?: AspectRatioMode;
  [key: string]: any;
}

export function PlotContainer({
  className,
  layout,
  config,
  data,
  plotId = "chemplot-active-chart",
  aspectRatio = "auto",
  ...props
}: PlotContainerProps) {
  const mergedLayout: Partial<Plotly.Layout> = {
    autosize: true,
    paper_bgcolor: "#FFFFFF",
    plot_bgcolor: "#FFFFFF",
    font: {
      family: "Arial, -apple-system, sans-serif",
      size: 11,
      color: "#000000",
    },
    margin: { l: 65, r: 35, t: 35, b: 55 },
    hovermode: "closest",
    ...layout,
    xaxis: {
      gridcolor: "#EEF0F6",
      zeroline: false,
      tickfont: { family: "Arial, sans-serif", size: 10, color: "#000000" },
      showline: true,
      linecolor: "#000000",
      ...layout?.xaxis,
    },
    yaxis: {
      gridcolor: "#EEF0F6",
      zeroline: false,
      tickfont: { family: "Arial, sans-serif", size: 10, color: "#000000" },
      showline: true,
      linecolor: "#000000",
      ...layout?.yaxis,
    },
  };

  const mergedConfig: Partial<Plotly.Config> = {
    responsive: true,
    displayModeBar: true,
    displaylogo: false,
    modeBarButtonsToRemove: ["lasso2d", "select2d"],
    toImageButtonOptions: {
      format: "png",
      filename: "chemplot_publication_figure",
      height: 800,
      width: 1000,
      scale: 3.5, // 300+ DPI high resolution
    },
    ...config,
  };

  let aspectClass = "w-full min-h-[440px]";
  if (aspectRatio === "square") {
    aspectClass = "w-full max-w-[560px] mx-auto aspect-square min-h-[440px]";
  } else if (aspectRatio === "journal-4-3") {
    aspectClass = "w-full max-w-[660px] mx-auto aspect-[4/3] min-h-[440px]";
  }

  return (
    <div id={plotId} className={`${aspectClass} ${className || ""}`}>
      <Plot
        divId={`${plotId}-inner`}
        data={data}
        layout={mergedLayout}
        config={mergedConfig}
        style={{ width: "100%", height: "100%" }}
        {...props}
      />
    </div>
  );
}
