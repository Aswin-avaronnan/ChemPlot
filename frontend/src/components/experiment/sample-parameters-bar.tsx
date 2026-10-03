"use client";

import * as React from "react";
import { Experiment } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Scale, Square, Sliders, AlertCircle, CheckCircle2 } from "lucide-react";

interface SampleParametersBarProps {
  experiment: Experiment;
  onOpenEdit: () => void;
}

export function SampleParametersBar({ experiment, onOpenEdit }: SampleParametersBarProps) {
  const hasMass = experiment.mass_mg !== null && experiment.mass_mg !== undefined && experiment.mass_mg > 0;
  const hasArea = experiment.area_cm2 !== null && experiment.area_cm2 !== undefined && experiment.area_cm2 > 0;

  return (
    <div className="bg-surface border border-border rounded px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs mb-4">
      <div className="flex flex-wrap items-center gap-4">
        <span className="text-ink-muted font-medium uppercase tracking-wider text-[10px]">
          Sample Parameters
        </span>

        {/* Mass indicator */}
        <div className="flex items-center gap-1.5">
          <Scale className="w-3.5 h-3.5 text-ink-muted" />
          <span className="text-ink-muted">Mass:</span>
          {hasMass ? (
            <span className="font-mono font-medium text-ink">
              {experiment.mass_mg} mg
              {experiment.active_material_pct && experiment.active_material_pct < 100 && (
                <span className="text-ink-muted font-normal ml-1">
                  ({experiment.active_material_pct}% active)
                </span>
              )}
            </span>
          ) : (
            <Badge variant="warning" className="cursor-pointer" onClick={onOpenEdit}>
              <AlertCircle className="w-3 h-3 mr-0.5" />
              Not set (F/g disabled)
            </Badge>
          )}
        </div>

        {/* Area indicator */}
        <div className="flex items-center gap-1.5">
          <Square className="w-3.5 h-3.5 text-ink-muted" />
          <span className="text-ink-muted">Area:</span>
          {hasArea ? (
            <span className="font-mono font-medium text-ink">
              {experiment.area_cm2} cm²
            </span>
          ) : (
            <span className="font-mono text-ink-muted">1.0 cm² (default)</span>
          )}
        </div>

        {/* Reference Electrode */}
        <div className="hidden sm:flex items-center gap-1.5 text-ink-muted">
          <span>Ref:</span>
          <span className="font-mono text-ink">{experiment.reference_electrode || "Ag/AgCl"}</span>
        </div>

        {/* Electrolyte */}
        <div className="hidden md:flex items-center gap-1.5 text-ink-muted">
          <span>Electrolyte:</span>
          <span className="font-mono text-ink">{experiment.electrolyte || "1M KOH"}</span>
        </div>
      </div>

      <Button
        variant="secondary"
        size="sm"
        onClick={onOpenEdit}
        className="text-xs h-7 px-2.5 gap-1.5 shrink-0"
      >
        <Sliders className="w-3.5 h-3.5 text-ink-muted" />
        Configure Parameters
      </Button>
    </div>
  );
}
