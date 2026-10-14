"use client";

import * as React from "react";
import {
  PlotStyleConfig,
  COLOR_PALETTES,
  PRESETS,
  PlotAnnotation,
  FrameStyle,
  TickDirection,
  MarkerStyle,
  LegendPosition,
  AspectRatioMode,
} from "@/lib/plot-style";
import { Button } from "@/components/ui/button";
import {
  SlidersHorizontal,
  RotateCcw,
  Plus,
  Trash2,
  Check,
  ChevronDown,
  ChevronUp,
  Download,
  Info,
  Sparkles,
} from "lucide-react";

interface PlotCustomizerProps {
  styleConfig: PlotStyleConfig;
  onChange: (newConfig: PlotStyleConfig) => void;
  defaultXTitle?: string;
  defaultYTitle?: string;
  onExport?: (format: "png" | "svg") => void;
}

export function PlotCustomizer({
  styleConfig,
  onChange,
  defaultXTitle = "Potential vs Ref (V)",
  defaultYTitle = "Current (mA)",
  onExport,
}: PlotCustomizerProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<"frame" | "palette" | "axes" | "annotations" | "legend">("frame");
  const [newAnnotationText, setNewAnnotationText] = React.useState("");
  const [newAnnotationPos, setNewAnnotationPos] = React.useState<PlotAnnotation["position"]>("bottom-right");

  const updateConfig = (updates: Partial<PlotStyleConfig>) => {
    onChange({
      ...styleConfig,
      ...updates,
      presetName: "custom",
    });
  };

  const applyPreset = (presetKey: "acs" | "nature" | "modern") => {
    onChange({
      ...PRESETS[presetKey],
      // Preserve custom titles and annotations if user entered them
      xAxisTitle: styleConfig.xAxisTitle,
      yAxisTitle: styleConfig.yAxisTitle,
      annotations: styleConfig.annotations,
    });
  };

  const handleAddAnnotation = () => {
    if (!newAnnotationText.trim()) return;
    const newAnn: PlotAnnotation = {
      id: Math.random().toString(36).substring(2, 9),
      text: newAnnotationText.trim(),
      position: newAnnotationPos,
      isBold: true,
      fontSize: 11,
    };
    updateConfig({
      annotations: [...styleConfig.annotations, newAnn],
    });
    setNewAnnotationText("");
  };

  const handleRemoveAnnotation = (id: string) => {
    updateConfig({
      annotations: styleConfig.annotations.filter((a) => a.id !== id),
    });
  };

  const insertSymbol = (field: "x" | "y", symbol: string) => {
    if (field === "x") {
      const current = styleConfig.xAxisTitle ?? defaultXTitle;
      updateConfig({ xAxisTitle: current + symbol });
    } else {
      const current = styleConfig.yAxisTitle ?? defaultYTitle;
      updateConfig({ yAxisTitle: current + symbol });
    }
  };

  return (
    <div className="relative">
      {/* Trigger Bar */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 bg-surface rounded-md border border-border shadow-xs">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-1.5 text-xs font-medium h-7 px-2.5 bg-surface hover:bg-surface-sunken"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-accent-primary" />
            <span>Customize Figure</span>
            {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </Button>

          {/* Quick Preset Badges */}
          <div className="hidden sm:flex items-center gap-1 text-xs">
            <span className="text-[11px] text-ink-muted mr-1">Presets:</span>
            <button
              onClick={() => applyPreset("acs")}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                styleConfig.presetName === "acs"
                  ? "bg-ink text-white"
                  : "bg-surface-sunken text-ink-muted hover:text-ink hover:bg-border/60"
              }`}
              title="ACS Journal: Boxed frame, inward ticks on bottom & left only, no grid, ACS Jewel palette"
            >
              ACS Journal
            </button>
            <button
              onClick={() => applyPreset("nature")}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                styleConfig.presetName === "nature"
                  ? "bg-ink text-white"
                  : "bg-surface-sunken text-ink-muted hover:text-ink hover:bg-border/60"
              }`}
              title="Nature Standard: Refined square frame, inward ticks, sans-serif, Okabe-Ito"
            >
              Nature
            </button>
            <button
              onClick={() => applyPreset("modern")}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                styleConfig.presetName === "modern"
                  ? "bg-ink text-white"
                  : "bg-surface-sunken text-ink-muted hover:text-ink hover:bg-border/60"
              }`}
            >
              Modern Web
            </button>
          </div>
        </div>

        {/* Quick Export Trigger */}
        {onExport && (
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onExport("png")}
              className="h-7 text-xs px-2.5 flex items-center gap-1 text-ink"
              title="Download high-resolution 300+ DPI PNG matching customized view"
            >
              <Download className="w-3 h-3 text-ink-muted" />
              <span>300 DPI PNG</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onExport("svg")}
              className="h-7 text-xs px-2.5 flex items-center gap-1 text-ink"
              title="Download publication vector SVG"
            >
              <Download className="w-3 h-3 text-ink-muted" />
              <span>SVG</span>
            </Button>
          </div>
        )}
      </div>

      {/* Expandable Customization Panel */}
      {isOpen && (
        <div className="mt-2 p-3 bg-surface border border-border rounded-lg shadow-md animate-in fade-in-50 duration-150 z-20">
          {/* Tabs */}
          <div className="flex border-b border-border mb-3 text-xs overflow-x-auto gap-1">
            <button
              onClick={() => setActiveTab("frame")}
              className={`px-3 py-1.5 font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === "frame"
                  ? "border-accent-primary text-ink"
                  : "border-transparent text-ink-muted hover:text-ink"
              }`}
            >
              Axes & Frame
            </button>
            <button
              onClick={() => setActiveTab("palette")}
              className={`px-3 py-1.5 font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === "palette"
                  ? "border-accent-primary text-ink"
                  : "border-transparent text-ink-muted hover:text-ink"
              }`}
            >
              Curves & Palette
            </button>
            <button
              onClick={() => setActiveTab("axes")}
              className={`px-3 py-1.5 font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === "axes"
                  ? "border-accent-primary text-ink"
                  : "border-transparent text-ink-muted hover:text-ink"
              }`}
            >
              Titles & Ranges
            </button>
            <button
              onClick={() => setActiveTab("annotations")}
              className={`px-3 py-1.5 font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === "annotations"
                  ? "border-accent-primary text-ink"
                  : "border-transparent text-ink-muted hover:text-ink"
              }`}
            >
              In-Plot Badges ({styleConfig.annotations.length})
            </button>
            <button
              onClick={() => setActiveTab("legend")}
              className={`px-3 py-1.5 font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === "legend"
                  ? "border-accent-primary text-ink"
                  : "border-transparent text-ink-muted hover:text-ink"
              }`}
            >
              Legend & Layout
            </button>
          </div>

          {/* TAB 1: Axes & Frame */}
          {activeTab === "frame" && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {/* Frame Style */}
                <div>
                  <label className="block font-medium text-ink mb-1.5">Frame Spines</label>
                  <div className="inline-flex rounded border border-border p-0.5 bg-surface-sunken w-full">
                    <button
                      onClick={() => updateConfig({ frameStyle: "box" })}
                      className={`flex-1 py-1 rounded text-center transition-colors ${
                        styleConfig.frameStyle === "box"
                          ? "bg-surface text-ink font-semibold shadow-xs"
                          : "text-ink-muted hover:text-ink"
                      }`}
                    >
                      Enclosed Box (4 Spines)
                    </button>
                    <button
                      onClick={() => updateConfig({ frameStyle: "l-shape" })}
                      className={`flex-1 py-1 rounded text-center transition-colors ${
                        styleConfig.frameStyle === "l-shape"
                          ? "bg-surface text-ink font-semibold shadow-xs"
                          : "text-ink-muted hover:text-ink"
                      }`}
                    >
                      L-Shape (2 Spines)
                    </button>
                  </div>
                  <p className="text-[10px] text-ink-muted mt-1">
                    *ACS standard: Solid border on all 4 sides; ticks on bottom & left only.
                  </p>
                </div>

                {/* Axis Line Thickness */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="font-medium text-ink">Spine Line Thickness</label>
                    <span className="font-mono text-ink-muted">{styleConfig.axisLineWidth.toFixed(1)} pt</span>
                  </div>
                  <input
                    type="range"
                    min="0.8"
                    max="3.0"
                    step="0.2"
                    value={styleConfig.axisLineWidth}
                    onChange={(e) => updateConfig({ axisLineWidth: parseFloat(e.target.value) })}
                    className="w-full accent-accent-primary cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-ink-muted">
                    <span>0.8 pt (Fine)</span>
                    <span>1.8 pt (ACS)</span>
                    <span>3.0 pt (Thick)</span>
                  </div>
                </div>

                {/* Tick Marks Direction */}
                <div>
                  <label className="block font-medium text-ink mb-1.5">Tick Direction</label>
                  <div className="inline-flex rounded border border-border p-0.5 bg-surface-sunken w-full">
                    <button
                      onClick={() => updateConfig({ tickDirection: "in" })}
                      className={`flex-1 py-1 rounded text-center transition-colors ${
                        styleConfig.tickDirection === "in"
                          ? "bg-surface text-ink font-semibold shadow-xs"
                          : "text-ink-muted hover:text-ink"
                      }`}
                    >
                      Inward (Journal)
                    </button>
                    <button
                      onClick={() => updateConfig({ tickDirection: "out" })}
                      className={`flex-1 py-1 rounded text-center transition-colors ${
                        styleConfig.tickDirection === "out"
                          ? "bg-surface text-ink font-semibold shadow-xs"
                          : "text-ink-muted hover:text-ink"
                      }`}
                    >
                      Outward
                    </button>
                    <button
                      onClick={() => updateConfig({ tickDirection: "none" })}
                      className={`flex-1 py-1 rounded text-center transition-colors ${
                        styleConfig.tickDirection === "none"
                          ? "bg-surface text-ink font-semibold shadow-xs"
                          : "text-ink-muted hover:text-ink"
                      }`}
                    >
                      None
                    </button>
                  </div>
                </div>

                {/* Background Grid */}
                <div>
                  <label className="block font-medium text-ink mb-1.5">Background Grid Lines</label>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={styleConfig.showGrid}
                        onChange={(e) => updateConfig({ showGrid: e.target.checked })}
                        className="rounded border-border text-accent-primary focus:ring-0"
                      />
                      <span className="text-ink">Show gridlines</span>
                    </label>
                  </div>
                  <p className="text-[10px] text-ink-muted mt-1">
                    *Journals recommend pure white background (grid off).
                  </p>
                </div>

                {/* Axis / Spine Color */}
                <div>
                  <label className="block font-medium text-ink mb-1.5">Spine & Text Color</label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => updateConfig({ axisColor: "#000000" })}
                      className={`w-6 h-6 rounded-full border-2 transition-transform ${
                        styleConfig.axisColor === "#000000" ? "scale-110 border-accent-primary" : "border-border"
                      }`}
                      style={{ backgroundColor: "#000000" }}
                      title="Pure Black (Publication Standard)"
                    />
                    <button
                      type="button"
                      onClick={() => updateConfig({ axisColor: "#262B3A" })}
                      className={`w-6 h-6 rounded-full border-2 transition-transform ${
                        styleConfig.axisColor === "#262B3A" ? "scale-110 border-accent-primary" : "border-border"
                      }`}
                      style={{ backgroundColor: "#262B3A" }}
                      title="Navy Ink"
                    />
                    <button
                      type="button"
                      onClick={() => updateConfig({ axisColor: "#4B5563" })}
                      className={`w-6 h-6 rounded-full border-2 transition-transform ${
                        styleConfig.axisColor === "#4B5563" ? "scale-110 border-accent-primary" : "border-border"
                      }`}
                      style={{ backgroundColor: "#4B5563" }}
                      title="Charcoal"
                    />
                    <span className="text-[11px] font-mono text-ink-muted">{styleConfig.axisColor}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Curves & Palette */}
          {activeTab === "palette" && (
            <div className="space-y-4 text-xs">
              {/* Stroke Width Slider */}
              <div className="max-w-md">
                <div className="flex justify-between items-center mb-1.5">
                  <label className="font-medium text-ink">Plot Curve Thickness (Stroke)</label>
                  <span className="font-mono text-ink-muted">{styleConfig.strokeWidth.toFixed(1)} pt</span>
                </div>
                <input
                  type="range"
                  min="1.0"
                  max="4.0"
                  step="0.2"
                  value={styleConfig.strokeWidth}
                  onChange={(e) => updateConfig({ strokeWidth: parseFloat(e.target.value) })}
                  className="w-full accent-accent-primary cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-ink-muted">
                  <span>1.0 pt (Faint)</span>
                  <span>2.2 pt (ACS Journal)</span>
                  <span>4.0 pt (Heavy)</span>
                </div>
              </div>

              {/* Marker Style */}
              <div className="max-w-md">
                <label className="block font-medium text-ink mb-1.5">Data Point Markers</label>
                <div className="inline-flex rounded border border-border p-0.5 bg-surface-sunken w-full">
                  <button
                    onClick={() => updateConfig({ markerStyle: "none" })}
                    className={`flex-1 py-1 rounded text-center transition-colors ${
                      styleConfig.markerStyle === "none"
                        ? "bg-surface text-ink font-semibold shadow-xs"
                        : "text-ink-muted hover:text-ink"
                    }`}
                  >
                    Continuous Lines
                  </button>
                  <button
                    onClick={() => updateConfig({ markerStyle: "circle-open" })}
                    className={`flex-1 py-1 rounded text-center transition-colors ${
                      styleConfig.markerStyle === "circle-open"
                        ? "bg-surface text-ink font-semibold shadow-xs"
                        : "text-ink-muted hover:text-ink"
                    }`}
                  >
                    Open Circles (-o-)
                  </button>
                  <button
                    onClick={() => updateConfig({ markerStyle: "circle-filled" })}
                    className={`flex-1 py-1 rounded text-center transition-colors ${
                      styleConfig.markerStyle === "circle-filled"
                        ? "bg-surface text-ink font-semibold shadow-xs"
                        : "text-ink-muted hover:text-ink"
                    }`}
                  >
                    Filled Dots (-●-)
                  </button>
                </div>
              </div>

              {/* Palette Selection Grid */}
              <div>
                <label className="block font-medium text-ink mb-2">Scientific Color Palette</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {(Object.keys(COLOR_PALETTES) as Array<PlotStyleConfig["paletteId"]>).map((palKey) => {
                    const pal = COLOR_PALETTES[palKey];
                    const isSelected = styleConfig.paletteId === palKey;
                    return (
                      <div
                        key={palKey}
                        onClick={() => updateConfig({ paletteId: palKey })}
                        className={`p-2.5 rounded border cursor-pointer transition-all ${
                          isSelected
                            ? "border-accent-primary bg-accent-primary/5 ring-1 ring-accent-primary"
                            : "border-border bg-surface hover:border-ink-muted/50"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-semibold text-ink text-[11px]">{pal.name}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-accent-primary" />}
                        </div>
                        <div className="flex items-center gap-1">
                          {pal.colors.slice(0, 6).map((c, idx) => (
                            <span
                              key={idx}
                              className="w-4 h-4 rounded-full border border-black/10 inline-block shrink-0"
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                        <p className="text-[10px] text-ink-muted mt-1.5 line-clamp-1">{pal.description}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Titles & Ranges */}
          {activeTab === "axes" && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* X-Axis Title */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="font-medium text-ink">X-Axis Title</label>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-ink-muted">Quick insert:</span>
                      {["·", "⁻¹", "⁻²", "²", "Δ", "Ω"].map((sym) => (
                        <button
                          key={sym}
                          type="button"
                          onClick={() => insertSymbol("x", sym)}
                          className="px-1 py-0.5 bg-surface-sunken hover:bg-border rounded text-[10px] font-mono text-ink"
                        >
                          {sym}
                        </button>
                      ))}
                    </div>
                  </div>
                  <input
                    type="text"
                    value={styleConfig.xAxisTitle ?? defaultXTitle}
                    onChange={(e) => updateConfig({ xAxisTitle: e.target.value })}
                    placeholder={defaultXTitle}
                    className="w-full px-2.5 py-1.5 bg-surface text-ink border border-border rounded text-xs focus:outline-none focus:border-accent-primary font-mono"
                  />
                  <div className="mt-1 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => updateConfig({ xAxisTitle: defaultXTitle })}
                      className="text-[10px] text-ink-muted hover:text-ink underline"
                    >
                      Reset to default
                    </button>
                    <label className="flex items-center gap-1 cursor-pointer text-[11px] text-ink-muted">
                      <input
                        type="checkbox"
                        checked={styleConfig.isBoldLabels}
                        onChange={(e) => updateConfig({ isBoldLabels: e.target.checked })}
                        className="rounded border-border text-accent-primary"
                      />
                      <span>Bold label font</span>
                    </label>
                  </div>
                </div>

                {/* Y-Axis Title */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="font-medium text-ink">Y-Axis Title</label>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-ink-muted">Quick insert:</span>
                      {["·", "⁻¹", "⁻²", "²", "Δ", "Ω"].map((sym) => (
                        <button
                          key={sym}
                          type="button"
                          onClick={() => insertSymbol("y", sym)}
                          className="px-1 py-0.5 bg-surface-sunken hover:bg-border rounded text-[10px] font-mono text-ink"
                        >
                          {sym}
                        </button>
                      ))}
                    </div>
                  </div>
                  <input
                    type="text"
                    value={styleConfig.yAxisTitle ?? defaultYTitle}
                    onChange={(e) => updateConfig({ yAxisTitle: e.target.value })}
                    placeholder={defaultYTitle}
                    className="w-full px-2.5 py-1.5 bg-surface text-ink border border-border rounded text-xs focus:outline-none focus:border-accent-primary font-mono"
                  />
                  <div className="mt-1">
                    <button
                      type="button"
                      onClick={() => updateConfig({ yAxisTitle: defaultYTitle })}
                      className="text-[10px] text-ink-muted hover:text-ink underline"
                    >
                      Reset to default
                    </button>
                  </div>
                </div>
              </div>

              {/* Axis Ranges */}
              <div className="border-t border-border pt-3">
                <h4 className="font-medium text-ink mb-2">Axis Range Limits (Manual vs Auto)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* X-Axis Range */}
                  <div className="p-2.5 rounded bg-surface-sunken border border-border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-ink">X-Axis Range</span>
                      <label className="flex items-center gap-1.5 cursor-pointer text-xs">
                        <input
                          type="checkbox"
                          checked={styleConfig.xRangeAuto}
                          onChange={(e) => updateConfig({ xRangeAuto: e.target.checked })}
                          className="rounded border-border text-accent-primary"
                        />
                        <span>Auto</span>
                      </label>
                    </div>
                    {!styleConfig.xRangeAuto && (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-ink-muted">Min</label>
                          <input
                            type="number"
                            step="any"
                            value={styleConfig.xMin ?? ""}
                            onChange={(e) =>
                              updateConfig({ xMin: e.target.value ? parseFloat(e.target.value) : undefined })
                            }
                            placeholder="-1.0"
                            className="w-full px-2 py-1 bg-surface text-ink border border-border rounded text-xs font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-ink-muted">Max</label>
                          <input
                            type="number"
                            step="any"
                            value={styleConfig.xMax ?? ""}
                            onChange={(e) =>
                              updateConfig({ xMax: e.target.value ? parseFloat(e.target.value) : undefined })
                            }
                            placeholder="0.5"
                            className="w-full px-2 py-1 bg-surface text-ink border border-border rounded text-xs font-mono"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Y-Axis Range */}
                  <div className="p-2.5 rounded bg-surface-sunken border border-border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-ink">Y-Axis Range</span>
                      <label className="flex items-center gap-1.5 cursor-pointer text-xs">
                        <input
                          type="checkbox"
                          checked={styleConfig.yRangeAuto}
                          onChange={(e) => updateConfig({ yRangeAuto: e.target.checked })}
                          className="rounded border-border text-accent-primary"
                        />
                        <span>Auto</span>
                      </label>
                    </div>
                    {!styleConfig.yRangeAuto && (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-ink-muted">Min</label>
                          <input
                            type="number"
                            step="any"
                            value={styleConfig.yMin ?? ""}
                            onChange={(e) =>
                              updateConfig({ yMin: e.target.value ? parseFloat(e.target.value) : undefined })
                            }
                            placeholder="-2.0"
                            className="w-full px-2 py-1 bg-surface text-ink border border-border rounded text-xs font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-ink-muted">Max</label>
                          <input
                            type="number"
                            step="any"
                            value={styleConfig.yMax ?? ""}
                            onChange={(e) =>
                              updateConfig({ yMax: e.target.value ? parseFloat(e.target.value) : undefined })
                            }
                            placeholder="2.0"
                            className="w-full px-2 py-1 bg-surface text-ink border border-border rounded text-xs font-mono"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: In-Plot Annotations / Badges */}
          {activeTab === "annotations" && (
            <div className="space-y-4 text-xs">
              <div>
                <p className="text-ink-muted mb-3">
                  Add in-plot text annotations (e.g. scan rate <code className="bg-surface-sunken px-1 rounded font-mono">5 mV s⁻¹</code>, current density <code className="bg-surface-sunken px-1 rounded font-mono">0.25 A g⁻¹</code>, or sample material <code className="bg-surface-sunken px-1 rounded font-mono">Ti₃C₂Tₓ</code>) directly inside the plot frame, matching journal reference figures.
                </p>

                {/* Existing Annotations List */}
                {styleConfig.annotations.length > 0 ? (
                  <div className="space-y-2 mb-4">
                    {styleConfig.annotations.map((ann) => (
                      <div
                        key={ann.id}
                        className="flex items-center justify-between p-2 rounded bg-surface-sunken border border-border"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-ink font-mono text-xs">{ann.text}</span>
                          <span className="text-[10px] text-ink-muted px-1.5 py-0.5 rounded bg-surface border border-border">
                            {ann.position}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveAnnotation(ann.id)}
                          className="h-6 w-6 p-0 text-accent-danger hover:bg-accent-danger/10"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 text-center border border-dashed border-border rounded text-ink-muted mb-4">
                    No in-plot annotations added yet.
                  </div>
                )}

                {/* Add New Annotation Controls */}
                <div className="p-3 bg-surface-sunken rounded border border-border space-y-2.5">
                  <span className="font-medium text-ink block">Add In-Plot Callout</span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="text"
                      value={newAnnotationText}
                      onChange={(e) => setNewAnnotationText(e.target.value)}
                      placeholder="e.g. 5 mV s⁻¹"
                      className="sm:col-span-2 px-2.5 py-1.5 bg-surface text-ink border border-border rounded text-xs focus:outline-none focus:border-accent-primary font-mono"
                    />
                    <select
                      value={newAnnotationPos}
                      onChange={(e) => setNewAnnotationPos(e.target.value as any)}
                      className="px-2 py-1.5 bg-surface text-ink border border-border rounded text-xs focus:outline-none"
                    >
                      <option value="bottom-right">Bottom Right</option>
                      <option value="top-left">Top Left</option>
                      <option value="top-right">Top Right</option>
                      <option value="bottom-left">Bottom Left</option>
                      <option value="top-center">Top Center (Title)</option>
                    </select>
                  </div>

                  {/* Suggestion Chips */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] text-ink-muted">Quick presets:</span>
                    {["5 mV s⁻¹", "10 mV s⁻¹", "0.25 A g⁻¹", "1.0 A g⁻¹", "15 M NaClO₄"].map((sug) => (
                      <button
                        key={sug}
                        type="button"
                        onClick={() => setNewAnnotationText(sug)}
                        className="px-2 py-0.5 rounded bg-surface hover:bg-border text-[10px] font-mono text-ink border border-border"
                      >
                        {sug}
                      </button>
                    ))}
                  </div>

                  <Button
                    size="sm"
                    onClick={handleAddAnnotation}
                    disabled={!newAnnotationText.trim()}
                    className="w-full sm:w-auto h-7 px-3 text-xs bg-ink text-white hover:bg-ink/90 flex items-center justify-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Annotation</span>
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: Legend & Layout */}
          {activeTab === "legend" && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Legend Position */}
                <div>
                  <label className="block font-medium text-ink mb-1.5">Legend Position</label>
                  <div className="inline-flex flex-col gap-1 w-full">
                    {[
                      { key: "inside-tr", label: "Inside Top-Right (ACS Preferred)" },
                      { key: "inside-tl", label: "Inside Top-Left" },
                      { key: "bottom", label: "Bottom Row (Horizontal)" },
                      { key: "hidden", label: "Hidden / No Legend" },
                    ].map((item) => (
                      <button
                        key={item.key}
                        onClick={() => updateConfig({ legendPosition: item.key as LegendPosition })}
                        className={`px-3 py-1.5 text-left rounded border transition-colors flex items-center justify-between ${
                          styleConfig.legendPosition === item.key
                            ? "bg-surface text-ink font-semibold border-accent-primary shadow-xs"
                            : "bg-surface-sunken text-ink-muted border-border hover:text-ink"
                        }`}
                      >
                        <span>{item.label}</span>
                        {styleConfig.legendPosition === item.key && (
                          <Check className="w-3.5 h-3.5 text-accent-primary" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Aspect Ratio */}
                <div>
                  <label className="block font-medium text-ink mb-1.5">Figure Aspect Ratio</label>
                  <div className="inline-flex flex-col gap-1 w-full">
                    {[
                      { key: "journal-4-3", label: "Journal Standard (4:3)" },
                      { key: "square", label: "Square (1:1 Aspect Ratio)" },
                      { key: "auto", label: "Responsive / Wide" },
                    ].map((item) => (
                      <button
                        key={item.key}
                        onClick={() => updateConfig({ aspectRatio: item.key as AspectRatioMode })}
                        className={`px-3 py-1.5 text-left rounded border transition-colors flex items-center justify-between ${
                          styleConfig.aspectRatio === item.key
                            ? "bg-surface text-ink font-semibold border-accent-primary shadow-xs"
                            : "bg-surface-sunken text-ink-muted border-border hover:text-ink"
                        }`}
                      >
                        <span>{item.label}</span>
                        {styleConfig.aspectRatio === item.key && (
                          <Check className="w-3.5 h-3.5 text-accent-primary" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Bottom Bar: Reset to Defaults */}
          <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs">
            <button
              onClick={() => applyPreset("acs")}
              className="flex items-center gap-1 text-ink-muted hover:text-ink transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset to ACS Standard</span>
            </button>
            <span className="text-[11px] text-ink-muted font-mono">
              Style: <strong className="text-ink uppercase">{styleConfig.presetName}</strong>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
