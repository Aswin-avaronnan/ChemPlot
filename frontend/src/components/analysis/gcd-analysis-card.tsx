"use client";

import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api, Analysis } from "@/lib/api-client";
import { Zap, AlertCircle } from "lucide-react";

interface GCDAnalysisCardProps {
  runId: string;
  massMg?: number;
  areaCm2?: number;
}

export function GCDAnalysisCard({ runId, massMg, areaCm2 }: GCDAnalysisCardProps) {
  const [convention, setConvention] = React.useState<string>("nominal_window");
  const [analysis, setAnalysis] = React.useState<Analysis | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const fetchExisting = React.useCallback(async () => {
    try {
      const res = await api.listRunAnalyses(runId);
      const gcdAn = res.analyses.find((a) => a.analysis_type === "gcd_specific_capacitance");
      if (gcdAn) {
        setAnalysis(gcdAn);
        setConvention(gcdAn.convention);
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
      const res = await api.runAnalysis(runId, "gcd_specific_capacitance", convention, {
        mass_mg: massMg,
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
          <Zap className="w-4 h-4 text-[#F2C98E]" />
          <CardTitle className="text-sm">GCD Capacitance & Capacity</CardTitle>
        </div>
        {analysis && <Badge variant="success">Computed</Badge>}
      </CardHeader>
      <CardContent className="space-y-4 text-xs">
        <div>
          <label className="block text-ink-muted mb-1 font-medium">Discharge Window Convention:</label>
          <select
            value={convention}
            onChange={(e) => setConvention(e.target.value)}
            className="w-full px-2.5 py-1.5 bg-surface text-ink border border-border rounded focus:outline-none focus:ring-1 focus:ring-accent-primary"
          >
            <option value="nominal_window">Nominal Window (ΔV = Vstart - Vend)</option>
            <option value="exclude_ir_drop">Exclude IR Drop (ΔV' = ΔV - IRdrop at discharge onset)</option>
          </select>
          <p className="text-[11px] text-ink-muted mt-1">
            C = (I · Δt) / (m · ΔV), ESR = IRdrop / (2 · I)
          </p>
        </div>

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
          {loading ? "Calculating..." : "Compute GCD Metrics"}
        </Button>

        {res && (
          <div className="pt-3 border-t border-border space-y-2.5">
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 bg-surface-sunken rounded border border-border/60">
                <span className="text-[10px] text-ink-muted block uppercase">Specific Capacitance</span>
                <span className="font-mono text-base font-semibold text-ink">
                  {res.specific_capacitance_f_g !== null && res.specific_capacitance_f_g !== undefined
                    ? `${res.specific_capacitance_f_g.toFixed(2)} F/g`
                    : "—"}
                </span>
              </div>
              <div className="p-2 bg-surface-sunken rounded border border-border/60">
                <span className="text-[10px] text-ink-muted block uppercase">Specific Capacity</span>
                <span className="font-mono text-base font-semibold text-ink">
                  {res.specific_capacity_mah_g !== null && res.specific_capacity_mah_g !== undefined
                    ? `${res.specific_capacity_mah_g.toFixed(2)} mAh/g`
                    : "—"}
                </span>
              </div>
            </div>

            <div className="text-[11px] space-y-1 font-mono text-ink-muted bg-surface-sunken/50 p-2 rounded">
              <div className="flex justify-between">
                <span>Discharge Time (Δt):</span>
                <span className="text-ink font-medium">{res.discharge_time_s?.toFixed(2)} s</span>
              </div>
              <div className="flex justify-between">
                <span>Discharge Window:</span>
                <span className="text-ink font-medium">{res.delta_v?.toFixed(3)} V</span>
              </div>
              <div className="flex justify-between">
                <span>Onset IR Drop:</span>
                <span className="text-ink font-medium">{res.ir_drop_v?.toFixed(4)} V</span>
              </div>
              <div className="flex justify-between">
                <span>Internal Resistance (ESR):</span>
                <span className="text-ink font-medium">{res.esr_ohm?.toFixed(2)} Ω</span>
              </div>
              <div className="flex justify-between">
                <span>Applied Current:</span>
                <span className="text-ink font-medium">{(res.applied_current_a * 1000)?.toFixed(2)} mA</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
