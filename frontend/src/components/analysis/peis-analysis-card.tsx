"use client";

import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api, Analysis } from "@/lib/api-client";
import { Activity, AlertCircle } from "lucide-react";

interface PEISAnalysisCardProps {
  runId: string;
  areaCm2?: number;
}

export function PEISAnalysisCard({ runId, areaCm2 }: PEISAnalysisCardProps) {
  const [analysis, setAnalysis] = React.useState<Analysis | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const fetchExisting = React.useCallback(async () => {
    try {
      const res = await api.listRunAnalyses(runId);
      const peisAn = res.analyses.find((a) => a.analysis_type === "peis_rs");
      if (peisAn) {
        setAnalysis(peisAn);
      }
    } catch {}
  }, [runId]);

  React.useEffect(() => {
    fetchExisting();
  }, [fetchExisting]);

  const handleCompute = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.runAnalysis(runId, "peis_rs", "real_intercept", {
        area_cm2: areaCm2,
      });
      setAnalysis(res);
    } catch (err: any) {
      setError(err.message || "Calculation failed");
    } finally {
      setLoading(false);
    }
  };

  const res = analysis?.result;

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#A7D8C5]" />
          <CardTitle className="text-sm">Impedance & Resistance Metrics</CardTitle>
        </div>
        {analysis && <Badge variant="success">Read</Badge>}
      </CardHeader>
      <CardContent className="space-y-4 text-xs">
        <p className="text-ink-muted">
          High-frequency real-axis intercept on the Nyquist plot yields series resistance (Rs). The high-frequency semicircle provides estimated charge transfer resistance (Rct).
        </p>

        {error && (
          <div className="p-2 bg-[#E8A9A3]/20 border border-[#E8A9A3] text-[#692923] rounded flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <Button
          variant="secondary"
          size="sm"
          onClick={handleCompute}
          disabled={loading}
          className="w-full text-xs"
        >
          {loading ? "Reading Nyquist Intercept..." : "Extract Rs & Rct"}
        </Button>

        {res && (
          <div className="pt-3 border-t border-border space-y-2.5">
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 bg-surface-sunken rounded border border-border/60">
                <span className="text-[10px] text-ink-muted block uppercase">Series Resistance (Rs)</span>
                <span className="font-mono text-base font-semibold text-ink">
                  {res.series_resistance_rs_ohm} Ω
                </span>
                {res.rs_area_normalized_ohm_cm2 && (
                  <span className="text-[10px] text-ink-muted block font-mono">
                    {res.rs_area_normalized_ohm_cm2} Ω·cm²
                  </span>
                )}
              </div>
              <div className="p-2 bg-surface-sunken rounded border border-border/60">
                <span className="text-[10px] text-ink-muted block uppercase">Est. Rct (Diameter)</span>
                <span className="font-mono text-base font-semibold text-ink">
                  {res.estimated_rct_ohm ? `${res.estimated_rct_ohm} Ω` : "—"}
                </span>
                {res.rct_area_normalized_ohm_cm2 && (
                  <span className="text-[10px] text-ink-muted block font-mono">
                    {res.rct_area_normalized_ohm_cm2} Ω·cm²
                  </span>
                )}
              </div>
            </div>

            <div className="text-[11px] space-y-1 font-mono text-ink-muted bg-surface-sunken/50 p-2 rounded">
              <div className="flex justify-between">
                <span>Frequency Range:</span>
                <span className="text-ink font-medium">
                  {res.frequency_min_hz} Hz – {(res.frequency_max_hz / 1000)?.toFixed(1)} kHz
                </span>
              </div>
              <div className="flex justify-between">
                <span>Peak Frequency:</span>
                <span className="text-ink font-medium">{res.peak_frequency_hz} Hz</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
