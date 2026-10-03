"use client";

import Link from "next/link";
import { FlaskConical, UploadCloud, BarChart2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-8 py-16 text-center">
      <div className="w-14 h-14 rounded-xl bg-[#8FAADC]/15 flex items-center justify-center mb-6">
        <FlaskConical className="w-7 h-7 text-[#5077B8]" />
      </div>

      <h1 className="text-2xl font-semibold text-ink mb-2 tracking-tight">
        ChemPlot Electrochem Studio
      </h1>
      <p className="text-sm text-ink-muted max-w-sm leading-relaxed mb-8">
        Upload your first Bio-Logic export to see it here. Supports CV, GCPL, PEIS from .mpr files.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-xl w-full mb-10">
        {[
          {
            icon: UploadCloud,
            title: "Upload .mpr Files",
            desc: "Drag & drop Bio-Logic potentiostat exports — single or multi-file scan-rate series",
            color: "text-[#8FAADC]",
          },
          {
            icon: BarChart2,
            title: "Interactive Plots",
            desc: "CV overlays, GCD curves, Nyquist & Bode charts. Hover, zoom, and inspect data.",
            color: "text-[#A7D8C5]",
          },
          {
            icon: FlaskConical,
            title: "Publication Export",
            desc: "Download journal-ready SVG, PNG or PDF figures in Nature or ACS style.",
            color: "text-[#F2C98E]",
          },
        ].map(({ icon: Icon, title, desc, color }) => (
          <div
            key={title}
            className="bg-surface border border-border rounded p-4 text-left"
          >
            <Icon className={`w-5 h-5 mb-3 ${color}`} />
            <div className="text-sm font-medium text-ink mb-1">{title}</div>
            <div className="text-xs text-ink-muted leading-relaxed">{desc}</div>
          </div>
        ))}
      </div>

      <p className="text-xs text-ink-muted">
        Create an experiment using the sidebar, or click below to get started.
      </p>
    </div>
  );
}
