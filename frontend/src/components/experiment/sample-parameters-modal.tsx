"use client";

import * as React from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Experiment, api } from "@/lib/api-client";
import { FlaskConical, Scale, Square, Info } from "lucide-react";

interface SampleParametersModalProps {
  isOpen: boolean;
  onClose: () => void;
  experiment: Experiment;
  onSaved: (updated: Experiment) => void;
}

export function SampleParametersModal({
  isOpen,
  onClose,
  experiment,
  onSaved,
}: SampleParametersModalProps) {
  const [massUnit, setMassUnit] = React.useState<"mg" | "g">("mg");
  const [areaUnit, setAreaUnit] = React.useState<"cm2" | "mm2">("cm2");

  // Local state initialized from experiment
  const [massValue, setMassValue] = React.useState<string>(
    experiment.mass_mg ? String(experiment.mass_mg) : ""
  );
  const [areaValue, setAreaValue] = React.useState<string>(
    experiment.area_cm2 ? String(experiment.area_cm2) : "1.0"
  );
  const [activePct, setActivePct] = React.useState<string>(
    experiment.active_material_pct ? String(experiment.active_material_pct) : "100"
  );
  const [refElectrode, setRefElectrode] = React.useState<string>(
    experiment.reference_electrode || "Ag/AgCl (3M KCl)"
  );
  const [electrolyte, setElectrolyte] = React.useState<string>(
    experiment.electrolyte || "1M KOH"
  );
  const [sampleLabel, setSampleLabel] = React.useState<string>(
    experiment.sample_label || ""
  );
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (experiment) {
      setMassValue(experiment.mass_mg ? String(experiment.mass_mg) : "");
      setAreaValue(experiment.area_cm2 ? String(experiment.area_cm2) : "1.0");
      setActivePct(experiment.active_material_pct ? String(experiment.active_material_pct) : "100");
      setRefElectrode(experiment.reference_electrode || "Ag/AgCl (3M KCl)");
      setElectrolyte(experiment.electrolyte || "1M KOH");
      setSampleLabel(experiment.sample_label || "");
    }
  }, [experiment]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      let finalMassMg: number | undefined = undefined;
      if (massValue.trim() !== "") {
        const parsedMass = parseFloat(massValue);
        if (isNaN(parsedMass) || parsedMass <= 0) {
          throw new Error("Active material mass must be a positive number.");
        }
        finalMassMg = massUnit === "g" ? parsedMass * 1000 : parsedMass;
      }

      let finalAreaCm2: number | undefined = undefined;
      if (areaValue.trim() !== "") {
        const parsedArea = parseFloat(areaValue);
        if (isNaN(parsedArea) || parsedArea <= 0) {
          throw new Error("Electrode area must be a positive number.");
        }
        finalAreaCm2 = areaUnit === "mm2" ? parsedArea / 100 : parsedArea;
      }

      const parsedPct = parseFloat(activePct) || 100.0;
      if (parsedPct <= 0 || parsedPct > 100) {
        throw new Error("Active material percentage must be between 0 and 100%.");
      }

      const updated = await api.updateExperiment(experiment.id, {
        mass_mg: finalMassMg,
        area_cm2: finalAreaCm2,
        active_material_pct: parsedPct,
        reference_electrode: refElectrode,
        electrolyte: electrolyte,
        sample_label: sampleLabel,
      });

      onSaved(updated);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to update sample parameters.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Electrode & Cell Parameters"
      description="Specify physical parameters for accurate gravimetric (F/g, A/g) and areal (mF/cm²) normalization."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div className="p-3 bg-surface-sunken border border-border rounded flex items-start gap-2 text-ink-muted">
          <Info className="w-4 h-4 text-[#8FAADC] shrink-0 mt-0.5" />
          <span>
            Bio-Logic potentiostat files often omit active electrode mass or area. ChemPlot uses these calibrated parameters across all CV, GCD, and EIS plots.
          </span>
        </div>

        {error && (
          <div className="p-2 bg-[#E8A9A3]/20 border border-[#E8A9A3] text-[#692923] rounded">
            {error}
          </div>
        )}

        {/* Mass Input */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="font-medium text-ink flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5 text-ink-muted" />
              Active Material Mass
            </label>
            <div className="flex rounded border border-border overflow-hidden">
              <button
                type="button"
                onClick={() => {
                  if (massUnit === "g" && massValue) {
                    setMassValue(String(parseFloat(massValue) * 1000));
                  }
                  setMassUnit("mg");
                }}
                className={`px-2 py-0.5 font-mono text-[11px] ${
                  massUnit === "mg" ? "bg-accent-primary text-white font-medium" : "bg-surface hover:bg-surface-sunken"
                }`}
              >
                mg
              </button>
              <button
                type="button"
                onClick={() => {
                  if (massUnit === "mg" && massValue) {
                    setMassValue(String(parseFloat(massValue) / 1000));
                  }
                  setMassUnit("g");
                }}
                className={`px-2 py-0.5 font-mono text-[11px] ${
                  massUnit === "g" ? "bg-accent-primary text-white font-medium" : "bg-surface hover:bg-surface-sunken"
                }`}
              >
                g
              </button>
            </div>
          </div>
          <Input
            type="number"
            step="any"
            placeholder={`e.g. ${massUnit === "mg" ? "1.50" : "0.0015"}`}
            value={massValue}
            onChange={(e) => setMassValue(e.target.value)}
            className="font-mono"
            helperText={`Used for specific current (A/g), specific capacitance (F/g), and specific capacity (mAh/g).`}
          />
        </div>

        {/* Area Input */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="font-medium text-ink flex items-center gap-1.5">
              <Square className="w-3.5 h-3.5 text-ink-muted" />
              Geometric Electrode Area
            </label>
            <div className="flex rounded border border-border overflow-hidden">
              <button
                type="button"
                onClick={() => {
                  if (areaUnit === "mm2" && areaValue) {
                    setAreaValue(String(parseFloat(areaValue) / 100));
                  }
                  setAreaUnit("cm2");
                }}
                className={`px-2 py-0.5 font-mono text-[11px] ${
                  areaUnit === "cm2" ? "bg-accent-primary text-white font-medium" : "bg-surface hover:bg-surface-sunken"
                }`}
              >
                cm²
              </button>
              <button
                type="button"
                onClick={() => {
                  if (areaUnit === "cm2" && areaValue) {
                    setAreaValue(String(parseFloat(areaValue) * 100));
                  }
                  setAreaUnit("mm2");
                }}
                className={`px-2 py-0.5 font-mono text-[11px] ${
                  areaUnit === "mm2" ? "bg-accent-primary text-white font-medium" : "bg-surface hover:bg-surface-sunken"
                }`}
              >
                mm²
              </button>
            </div>
          </div>
          <Input
            type="number"
            step="any"
            placeholder="e.g. 1.0"
            value={areaValue}
            onChange={(e) => setAreaValue(e.target.value)}
            className="font-mono"
            helperText="Used for areal current density (mA/cm²) and areal capacitance (mF/cm²)."
          />
        </div>

        {/* Active Material Ratio */}
        <div>
          <label className="block font-medium text-ink mb-1">
            Active Material Loading Fraction (%)
          </label>
          <Input
            type="number"
            step="0.1"
            min="1"
            max="100"
            placeholder="100"
            value={activePct}
            onChange={(e) => setActivePct(e.target.value)}
            className="font-mono"
            helperText="E.g. 80% if electrode composite slurry is 80:10:10 (active : binder : carbon)."
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-medium text-ink mb-1">Reference Electrode</label>
            <select
              value={refElectrode}
              onChange={(e) => setRefElectrode(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-surface text-ink border border-border rounded focus:outline-none focus:ring-1 focus:ring-accent-primary"
            >
              <option value="Ag/AgCl (3M KCl)">Ag/AgCl (3M KCl)</option>
              <option value="Ag/AgCl (sat. KCl)">Ag/AgCl (sat. KCl)</option>
              <option value="SCE (Sat. Calomel)">SCE (Sat. Calomel)</option>
              <option value="Standard Hydrogen (RHE)">Standard Hydrogen (RHE)</option>
              <option value="Hg/HgO (1M KOH)">Hg/HgO (1M KOH)</option>
              <option value="Li/Li+">Li/Li+</option>
              <option value="Custom">Custom / Unspecified</option>
            </select>
          </div>
          <div>
            <label className="block font-medium text-ink mb-1">Electrolyte</label>
            <Input
              type="text"
              placeholder="e.g. 1M KOH"
              value={electrolyte}
              onChange={(e) => setElectrolyte(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="block font-medium text-ink mb-1">Sample Label / Batch</label>
          <Input
            type="text"
            placeholder="e.g. NiCo2O4-3h-run1"
            value={sampleLabel}
            onChange={(e) => setSampleLabel(e.target.value)}
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Apply Parameters"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
