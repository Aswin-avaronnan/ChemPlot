"use client";

import * as React from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, Experiment } from "@/lib/api-client";
import { UploadCloud, FileSpreadsheet, X, AlertCircle, Scale, Square } from "lucide-react";

interface MPRUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  experiment: Experiment;
  onUploadSuccess: () => void;
}

export function MPRUploadModal({
  isOpen,
  onClose,
  experiment,
  onUploadSuccess,
}: MPRUploadModalProps) {
  const [selectedFiles, setSelectedFiles] = React.useState<File[]>([]);
  const [technique, setTechnique] = React.useState<string>("auto");
  const [massInput, setMassInput] = React.useState<string>(
    experiment.mass_mg ? String(experiment.mass_mg) : ""
  );
  const [areaInput, setAreaInput] = React.useState<string>(
    experiment.area_cm2 ? String(experiment.area_cm2) : "1.0"
  );
  const [isUploading, setIsUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (experiment) {
      if (experiment.mass_mg) setMassInput(String(experiment.mass_mg));
      if (experiment.area_cm2) setAreaInput(String(experiment.area_cm2));
    }
  }, [experiment]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArr = Array.from(e.target.files);
      setSelectedFiles((prev) => [...prev, ...filesArr]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      setError("Please select at least one Bio-Logic .mpr file to upload.");
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      // 1. Update experiment mass & area if user filled them out in this upload form
      const massVal = parseFloat(massInput);
      const areaVal = parseFloat(areaInput);
      if (!isNaN(massVal) && massVal > 0) {
        await api.updateExperiment(experiment.id, {
          mass_mg: massVal,
          area_cm2: !isNaN(areaVal) && areaVal > 0 ? areaVal : experiment.area_cm2,
        });
      }

      // 2. Upload files
      const declared = technique === "auto" ? undefined : technique;
      await api.uploadRuns(experiment.id, selectedFiles, declared);

      setSelectedFiles([]);
      onUploadSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Upload failed.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Upload Bio-Logic Instrument Files"
      description="Upload raw .mpr binary potentiostat exports (single or multi-file series)."
      maxWidth="lg"
    >
      <div className="space-y-4 text-xs">
        {error && (
          <div className="p-2.5 bg-[#E8A9A3]/20 border border-[#E8A9A3] text-[#692923] rounded flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Dropzone */}
        <label
          className="border-2 border-dashed border-border rounded p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-surface-sunken/50 transition-colors"
        >
          <UploadCloud className="w-8 h-8 text-[#8FAADC] mb-2" />
          <span className="font-medium text-ink">Choose .mpr files or drag & drop here</span>
          <span className="text-[11px] text-ink-muted mt-1">
            Supports multi-file upload for scan-rate series (2, 5, 10, 20... mV/s) or rate series
          </span>
          <input
            type="file"
            multiple
            accept=".mpr,.mpt"
            onChange={handleFileChange}
            className="hidden"
          />
        </label>

        {/* Selected files list */}
        {selectedFiles.length > 0 && (
          <div className="space-y-1.5 max-h-36 overflow-y-auto border border-border rounded p-2 bg-surface-sunken">
            <span className="text-[10px] font-medium text-ink-muted block uppercase">
              Selected Files ({selectedFiles.length})
            </span>
            {selectedFiles.map((file, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between py-1 px-2 bg-surface rounded text-[11px] font-mono border border-border/40"
              >
                <div className="flex items-center gap-1.5 truncate">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-[#8FAADC] shrink-0" />
                  <span className="truncate">{file.name}</span>
                  <span className="text-ink-muted">({(file.size / 1024).toFixed(0)} KB)</span>
                </div>
                <button
                  type="button"
                  onClick={() => removeFile(idx)}
                  className="text-ink-muted hover:text-ink p-0.5 rounded"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Technique selection */}
        <div>
          <label className="block text-ink-muted mb-1 font-medium">Technique:</label>
          <select
            value={technique}
            onChange={(e) => setTechnique(e.target.value)}
            className="w-full px-2.5 py-1.5 bg-surface text-ink border border-border rounded focus:outline-none focus:ring-1 focus:ring-accent-primary"
          >
            <option value="auto">Auto-Detect from Column Signature (Recommended)</option>
            <option value="CV">Cyclic Voltammetry (CV)</option>
            <option value="GCPL">Galvanostatic Charge-Discharge (GCPL/GCD)</option>
            <option value="CYCLING">Galvanostatic Cycling</option>
            <option value="PEIS">Potentio Electrochemical Impedance (PEIS)</option>
            <option value="SPEIS">Staircase Potentio EIS (SPEIS)</option>
          </select>
        </div>

        {/* First-class sample parameters form */}
        <div className="p-3 bg-surface-sunken border border-border rounded space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-medium text-ink flex items-center gap-1.5 text-xs">
              <Scale className="w-3.5 h-3.5 text-ink-muted" />
              Active Mass & Area Calibration
            </span>
            <span className="text-[10px] text-ink-muted">Optional before plot</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-ink-muted mb-1">Active Mass (mg)</label>
              <Input
                type="number"
                step="any"
                placeholder="e.g. 1.50"
                value={massInput}
                onChange={(e) => setMassInput(e.target.value)}
                className="font-mono text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] text-ink-muted mb-1">Electrode Area (cm²)</label>
              <Input
                type="number"
                step="any"
                placeholder="1.0"
                value={areaInput}
                onChange={(e) => setAreaInput(e.target.value)}
                className="font-mono text-xs"
              />
            </div>
          </div>
          <p className="text-[10px] text-ink-muted">
            EC-Lab potentiostat exports typically do not record weighed mass. You can enter or update this at any time.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isUploading}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleUpload}
            disabled={isUploading || selectedFiles.length === 0}
          >
            {isUploading ? "Uploading & Enqueuing..." : `Upload ${selectedFiles.length} File${selectedFiles.length > 1 ? "s" : ""}`}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
