/// <reference types="plotly.js-dist-min" />

declare module "react-plotly.js" {
  import * as React from "react";

  export interface PlotParams {
    data?: any[];
    layout?: any;
    config?: any;
    frames?: any[];
    style?: React.CSSProperties;
    className?: string;
    useResizeHandler?: boolean;
    onInitialized?: (figure: any, graphDiv: HTMLElement) => void;
    onUpdate?: (figure: any, graphDiv: HTMLElement) => void;
    onPurge?: (figure: any, graphDiv: HTMLElement) => void;
    onError?: (err: Error) => void;
    [key: string]: any;
  }

  const Plot: React.ComponentType<PlotParams>;
  export default Plot;
}
