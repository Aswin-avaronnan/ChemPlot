"use client";

import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api, Analysis } from "@/lib/api-client";
import { Calculator, Check, AlertCircle } from "lucide-react";

interface CVAnalysisCardProps {
  runId: string;
  massMg?: number;
  areaCm2?: number;
  scanRateMvS?: number;
}

export function CVAnalysisCard({ runId, massMg, areaCm2, scanRateMvS }: CVAnalysisCardProps) {
  const [convention, setConvention] = React.useState<string>("full_window");
  const [analysis, setAnalysis] = React.useState<Analysis | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const fetchExisting = React.useCallback(async () => {
    try {
      const res = await api.listRunAnalyses(runId);
      const cvAn = res.analyses.find((a) => a.analysis_type === "cv_capacitance");
      if (cvAn) {
        setAnalysis(cvAn);
        setConvention(cvAn.convention);
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
      const res = await api.runAnalysis(runId, "cv_capacitance", convention, {
        mass_mg: massMg,
        area_cm2: areaCm2,
        scan_rate_mv_s: scanRateMvS,
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
          <Calculator className="w-4 h-4 text-[#8FAADC]" />
          <CardTitle className="text-sm">Cyclic Voltammetric Capacitance</CardTitle>
        </div>
        {analysis && <Badge variant="success">Computed</Badge>}
      </CardHeader>
      <CardContent className="space-y-4 text-xs">
        {/* Formula convention selection */}
        <div>
          <label className="block text-ink-muted mb-1 font-medium">Integration Convention:</label>
          <select
            value={convention}
            onChange={(e) => setConvention(e.target.value)}
            className="w-full px-2.5 py-1.5 bg-surface text-ink border border-border rounded focus:outline-none focus:ring-1 focus:ring-accent-primary"
          >
            <option value="full_window">Full Potential Window (ΔV = Vmax - Vmin)</option>
            <option value="exclude_ir_drop">Exclude IR Drop (ΔV - IRdrop at turnover)</option>
          </select>
          <p className="text-[11px] text-ink-muted mt-1">
            Calculated via loop integration: C = (∮ I dV) / (2 · ν · ΔV)
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
          {loading ? "Computing Integral..." : "Compute Capacitance"}
        </Button>

        {/* Results view */}
        {res && (
          <div className="pt-3 border-t border-border space-y-2.5">
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 bg-surface-sunken rounded border border-border/60">
                <span className="text-[10px] text-ink-muted block uppercase">Specific Capacitance</span>
                <span className="font-mono text-base font-semibold text-ink">
                  {res.specific_capacitance_f_g !== null && res.specific_capacitance_f_g !== undefined
                    ? `${res.specific_capacitance_f_g.toFixed(2)} F/g`
                    : "— (set mass)"}
                </span>
              </div>
              <div className="p-2 bg-surface-sunken rounded border border-border/60">
                <span className="text-[10px] text-ink-muted block uppercase">Areal Capacitance</span>
                <span className="font-mono text-base font-semibold text-ink">
                  {res.areal_capacitance_mf_cm2 !== null && res.areal_capacitance_mf_cm2 !== undefined
                    ? `${res.areal_capacitance_mf_cm2.toFixed(1)} mF/cm²`
                    : "—"}
                </span>
              </div>
            </div>

            <div className="text-[11px] space-y-1 font-mono text-ink-muted bg-surface-sunken/50 p-2 rounded">
              <div className="flex justify-between">
                <span>Total Capacitance:</span>
                <span className="text-ink font-medium">{res.total_capacitance_f?.toFixed(4)} F</span>
              </div>
              <div className="flex justify-between">
                <span>Window (ΔV):</span>
                <span className="text-ink font-medium">{res.delta_v?.toFixed(3)} V</span>
              </div>
              <div className="flex justify-between">
                <span>Scan Rate:</span>
                <span className="text-ink font-medium">{res.scan_rate_mv_s} mV/s</span>
              </div>
              {res.ir_drop_v > 0 && (
                <div className="flex justify-between">
                  <span>Deducted IR Drop:</span>
                  <span className="text-ink font-medium">{res.ir_drop_v.toFixed(4)} V</span>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
