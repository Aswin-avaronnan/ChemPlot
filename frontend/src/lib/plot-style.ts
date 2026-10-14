/**
 * ChemPlot Publication Plot Styling System
 * Provides scientific styling presets (ACS, Nature, Modern), color palettes,
 * and layout transformations for journal-grade figures.
 */

export type FrameStyle = "box" | "l-shape";
export type TickDirection = "in" | "out" | "none";
export type MarkerStyle = "none" | "circle-open" | "circle-filled";
export type LegendPosition = "inside-tr" | "inside-tl" | "bottom" | "hidden";
export type AspectRatioMode = "square" | "journal-4-3" | "auto";

export interface PlotAnnotation {
  id: string;
  text: string;
  position: "top-left" | "top-right" | "bottom-left" | "bottom-right" | "top-center";
  fontSize?: number;
  isBold?: boolean;
}

export interface PlotStyleConfig {
  presetName: "acs" | "nature" | "modern" | "custom";
  
  // 1. Frame & Spines
  frameStyle: FrameStyle;
  axisLineWidth: number;       // e.g. 1.8
  axisColor: string;           // e.g. "#000000"
  showGrid: boolean;           // default false for scientific publication
  tickDirection: TickDirection;// "in" (inward on left and bottom only)
  tickLength: number;          // e.g. 5
  
  // 2. Traces & Strokes
  strokeWidth: number;         // e.g. 2.2
  markerStyle: MarkerStyle;    // e.g. "none"
  markerSize: number;          // e.g. 5
  
  // 3. Color Palette
  paletteId: "acs-jewel" | "nature" | "okabe-ito" | "vibrant" | "viridis" | "monochrome";
  
  // 4. Axis Titles & Typography
  fontFamily: string;          // e.g. "Arial, sans-serif"
  isBoldLabels: boolean;
  axisLabelFontSize: number;   // e.g. 12
  tickFontSize: number;        // e.g. 10
  xAxisTitle?: string;
  yAxisTitle?: string;
  
  // 5. Axis Ranges
  xRangeAuto: boolean;
  xMin?: number;
  xMax?: number;
  yRangeAuto: boolean;
  yMin?: number;
  yMax?: number;
  
  // 6. In-Plot Annotations
  annotations: PlotAnnotation[];
  
  // 7. Legend & Layout
  legendPosition: LegendPosition;
  legendFrame: boolean;
  aspectRatio: AspectRatioMode;
}

/**
 * Curated Scientific Color Palettes
 */
export const COLOR_PALETTES: Record<
  PlotStyleConfig["paletteId"],
  { name: string; description: string; colors: string[] }
> = {
  "acs-jewel": {
    name: "ACS Classic Jewel",
    description: "High-contrast saturated tones modeled after standard ACS journal publications",
    colors: [
      "#1F4E79", // Navy
      "#C00000", // Crimson / Deep Red
      "#ED7D31", // Amber / Terracotta
      "#7030A0", // Purple
      "#00B050", // Emerald Green
      "#00A896", // Teal Cyan
      "#800000", // Maroon
      "#FFC000", // Rich Gold
    ],
  },
  "nature": {
    name: "Nature Standard",
    description: "Refined earth & jewel tones used in Nature portfolio publications",
    colors: [
      "#0072B2", // Deep Blue
      "#D55E00", // Vermilion
      "#009E73", // Sage Green
      "#CC79A7", // Dusty Rose
      "#E69F00", // Gold
      "#56B4E9", // Sky Blue
      "#495057", // Charcoal
      "#9B5DE5", // Violet
    ],
  },
  "okabe-ito": {
    name: "Okabe-Ito (Accessible)",
    description: "Universal colorblind-safe palette recognized internationally for accessibility",
    colors: [
      "#000000", // Black
      "#E69F00", // Orange
      "#56B4E9", // Sky Blue
      "#009E73", // Bluish Green
      "#F0E442", // Yellow
      "#0072B2", // Blue
      "#D55E00", // Vermilion
      "#CC79A7", // Reddish Purple
    ],
  },
  "vibrant": {
    name: "Vibrant Contrast",
    description: "Modern, high-energy palette for multi-curve scan rate overlays",
    colors: [
      "#0284C7", // Sky 600
      "#EA580C", // Orange 600
      "#16A34A", // Green 600
      "#9333EA", // Purple 600
      "#E11D48", // Rose 600
      "#CA8A04", // Yellow 600
      "#0D9488", // Teal 600
      "#4F46E5", // Indigo 600
    ],
  },
  "viridis": {
    name: "Viridis (Sequential)",
    description: "Perceptually uniform color scale ideal for progression rates and cycles",
    colors: [
      "#440154", // Dark Purple
      "#482878", // Indigo
      "#3E4A89", // Navy
      "#31688E", // Teal Blue
      "#26828E", // Cyan
      "#1F9E89", // Green Cyan
      "#35B779", // Light Green
      "#6DCD59", // Lime Green
    ],
  },
  "monochrome": {
    name: "Monochrome (Print)",
    description: "Greyscale progression for black-and-white journal printing",
    colors: [
      "#000000", // Pure Black
      "#333333", // Very Dark Grey
      "#555555", // Dark Grey
      "#777777", // Medium Grey
      "#999999", // Light Grey
      "#BBBBBB", // Silver
    ],
  },
};

/**
 * 1-Click Style Presets
 */
export const PRESETS: Record<"acs" | "nature" | "modern", PlotStyleConfig> = {
  // ACS Style matching Reference.png:
  // - Enclosed rectangular box (all 4 sides solid)
  // - Ticks on LEFT and BOTTOM ONLY (no ticks on top and right)
  // - Clean white background (no grid)
  // - Bold typography and thick axis lines
  acs: {
    presetName: "acs",
    frameStyle: "box",
    axisLineWidth: 1.8,
    axisColor: "#000000",
    showGrid: false,
    tickDirection: "in",
    tickLength: 6,
    strokeWidth: 2.2,
    markerStyle: "none",
    markerSize: 5,
    paletteId: "acs-jewel",
    fontFamily: "Arial, -apple-system, BlinkMacSystemFont, sans-serif",
    isBoldLabels: true,
    axisLabelFontSize: 12,
    tickFontSize: 10,
    xRangeAuto: true,
    yRangeAuto: true,
    annotations: [],
    legendPosition: "inside-tr",
    legendFrame: false,
    aspectRatio: "journal-4-3",
  },

  // Nature Style:
  // - Crisp 1.2pt frame, inward ticks on bottom and left
  // - Clean sans-serif, colorblind-safe palette, 1:1 aspect ratio
  nature: {
    presetName: "nature",
    frameStyle: "box",
    axisLineWidth: 1.2,
    axisColor: "#000000",
    showGrid: false,
    tickDirection: "in",
    tickLength: 5,
    strokeWidth: 2.0,
    markerStyle: "none",
    markerSize: 5,
    paletteId: "nature",
    fontFamily: "Helvetica, Arial, sans-serif",
    isBoldLabels: true,
    axisLabelFontSize: 11,
    tickFontSize: 9,
    xRangeAuto: true,
    yRangeAuto: true,
    annotations: [],
    legendPosition: "inside-tr",
    legendFrame: false,
    aspectRatio: "square",
  },

  // Modern Web Style:
  // - L-shape frame with soft grid, periwinkle accents
  modern: {
    presetName: "modern",
    frameStyle: "l-shape",
    axisLineWidth: 1.2,
    axisColor: "#262B3A",
    showGrid: true,
    tickDirection: "out",
    tickLength: 4,
    strokeWidth: 1.8,
    markerStyle: "none",
    markerSize: 4,
    paletteId: "okabe-ito",
    fontFamily: "Inter, -apple-system, sans-serif",
    isBoldLabels: false,
    axisLabelFontSize: 11,
    tickFontSize: 10,
    xRangeAuto: true,
    yRangeAuto: true,
    annotations: [],
    legendPosition: "bottom",
    legendFrame: false,
    aspectRatio: "auto",
  },
};

/**
 * Get series color for a given trace index under the selected palette
 */
export function getPaletteColor(paletteId: PlotStyleConfig["paletteId"], index: number): string {
  const pal = COLOR_PALETTES[paletteId] || COLOR_PALETTES["acs-jewel"];
  return pal.colors[index % pal.colors.length];
}

/**
 * Applies PlotStyleConfig to a Plotly Layout object
 */
export function applyStyleToPlotlyLayout(
  baseLayout: any,
  style: PlotStyleConfig,
  defaultXTitle?: string,
  defaultYTitle?: string,
  title?: string
): any {
  const effectiveXTitle = style.xAxisTitle !== undefined && style.xAxisTitle !== "" ? style.xAxisTitle : defaultXTitle;
  const effectiveYTitle = style.yAxisTitle !== undefined && style.yAxisTitle !== "" ? style.yAxisTitle : defaultYTitle;

  const fontStyle = {
    family: style.fontFamily,
    color: style.axisColor,
  };

  const titleFont = {
    ...fontStyle,
    size: style.axisLabelFontSize,
    weight: style.isBoldLabels ? "bold" : "normal",
  };

  const tickFont = {
    ...fontStyle,
    size: style.tickFontSize,
  };

  // Frame and Spines Configuration
  // When frameStyle is "box", mirror: true draws the opposite border (top/right)
  // with the exact same linecolor and linewidth, BUT Plotly DOES NOT place ticks on top/right.
  // This achieves the exact ACS/Origin look: Ticks on Left & Bottom only; solid line on Top & Right!
  const isBox = style.frameStyle === "box";
  const mirrorSetting = isBox ? true : false;
  const tickVal = style.tickDirection === "none" ? "" : style.tickDirection;

  // Build Axis layouts
  const xaxis: any = {
    showline: true,
    linecolor: style.axisColor,
    linewidth: style.axisLineWidth,
    mirror: mirrorSetting,
    ticks: tickVal,
    ticklen: style.tickLength,
    tickwidth: style.axisLineWidth,
    tickcolor: style.axisColor,
    tickfont: tickFont,
    showgrid: style.showGrid,
    gridcolor: "#E2E8F0",
    gridwidth: 0.8,
    zeroline: false, // Suppress zero-crossing lines cutting across plot box
    title: effectiveXTitle ? { text: effectiveXTitle, font: titleFont } : undefined,
    automargin: true,
    ...baseLayout?.xaxis,
  };

  if (!style.xRangeAuto && style.xMin !== undefined && style.xMax !== undefined && style.xMin < style.xMax) {
    xaxis.range = [style.xMin, style.xMax];
  } else if (baseLayout?.xaxis?.range && style.xRangeAuto) {
    delete xaxis.range;
  }

  const yaxis: any = {
    showline: true,
    linecolor: style.axisColor,
    linewidth: style.axisLineWidth,
    mirror: mirrorSetting,
    ticks: tickVal,
    ticklen: style.tickLength,
    tickwidth: style.axisLineWidth,
    tickcolor: style.axisColor,
    tickfont: tickFont,
    showgrid: style.showGrid,
    gridcolor: "#E2E8F0",
    gridwidth: 0.8,
    zeroline: false,
    title: effectiveYTitle ? { text: effectiveYTitle, font: titleFont } : undefined,
    automargin: true,
    ...baseLayout?.yaxis,
  };

  if (!style.yRangeAuto && style.yMin !== undefined && style.yMax !== undefined && style.yMin < style.yMax) {
    yaxis.range = [style.yMin, style.yMax];
  } else if (baseLayout?.yaxis?.range && style.yRangeAuto) {
    delete yaxis.range;
  }

  // Legend Positioning
  let legendConfig: any = { showlegend: true };
  if (style.legendPosition === "hidden") {
    legendConfig = { showlegend: false };
  } else if (style.legendPosition === "inside-tr") {
    legendConfig = {
      showlegend: true,
      legend: {
        x: 0.98,
        y: 0.98,
        xanchor: "right",
        yanchor: "top",
        bgcolor: "rgba(255, 255, 255, 0.88)",
        bordercolor: style.legendFrame ? style.axisColor : "transparent",
        borderwidth: style.legendFrame ? 1 : 0,
        font: { ...fontStyle, size: Math.max(style.tickFontSize - 1, 9) },
      },
    };
  } else if (style.legendPosition === "inside-tl") {
    legendConfig = {
      showlegend: true,
      legend: {
        x: 0.03,
        y: 0.98,
        xanchor: "left",
        yanchor: "top",
        bgcolor: "rgba(255, 255, 255, 0.88)",
        bordercolor: style.legendFrame ? style.axisColor : "transparent",
        borderwidth: style.legendFrame ? 1 : 0,
        font: { ...fontStyle, size: Math.max(style.tickFontSize - 1, 9) },
      },
    };
  } else {
    // Bottom
    legendConfig = {
      showlegend: true,
      legend: {
        orientation: "h",
        x: 0.5,
        y: -0.22,
        xanchor: "center",
        yanchor: "top",
        font: { ...fontStyle, size: Math.max(style.tickFontSize - 1, 9) },
      },
    };
  }

  // In-Plot Annotations (badges like "5 mV s⁻¹", "0.25 A g⁻¹", sample titles)
  const annotations: any[] = (style.annotations || []).map((ann) => {
    let x = 0.96;
    let y = 0.05;
    let xanchor = "right";
    let yanchor = "bottom";

    switch (ann.position) {
      case "top-left":
        x = 0.04;
        y = 0.95;
        xanchor = "left";
        yanchor = "top";
        break;
      case "top-right":
        x = 0.96;
        y = 0.95;
        xanchor = "right";
        yanchor = "top";
        break;
      case "bottom-left":
        x = 0.04;
        y = 0.05;
        xanchor = "left";
        yanchor = "bottom";
        break;
      case "bottom-right":
        x = 0.96;
        y = 0.05;
        xanchor = "right";
        yanchor = "bottom";
        break;
      case "top-center":
        x = 0.5;
        y = 1.05;
        xanchor = "center";
        yanchor = "bottom";
        break;
    }

    const textFormatted = ann.isBold ? `<b>${ann.text}</b>` : ann.text;

    return {
      text: textFormatted,
      xref: "paper",
      yref: "paper",
      x,
      y,
      xanchor,
      yanchor,
      showarrow: false,
      font: {
        family: style.fontFamily,
        size: ann.fontSize || style.tickFontSize + 1,
        color: style.axisColor,
      },
      bgcolor: "rgba(255, 255, 255, 0.75)",
      bordercolor: "transparent",
      borderwidth: 0,
      borderpad: 2,
    };
  });

  return {
    ...baseLayout,
    paper_bgcolor: "#FFFFFF",
    plot_bgcolor: "#FFFFFF",
    xaxis,
    yaxis,
    ...legendConfig,
    annotations: [...(baseLayout?.annotations || []), ...annotations],
    title: title ? { text: title, font: { ...titleFont, size: style.axisLabelFontSize + 1 } } : undefined,
  };
}
