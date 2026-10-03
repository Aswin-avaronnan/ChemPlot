"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { api, Experiment } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { FlaskConical, Plus, Loader2, ChevronRight, Beaker } from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();
  const [experiments, setExperiments] = React.useState<Experiment[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [creating, setCreating] = React.useState(false);
  const [newExpName, setNewExpName] = React.useState("");
  const [showCreateInput, setShowCreateInput] = React.useState(false);

  const fetchExperiments = React.useCallback(async () => {
    try {
      const res = await api.listExperiments();
      setExperiments(res.experiments);
    } catch {
      // silently degrade if backend not ready
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchExperiments();
  }, [fetchExperiments]);

  const handleCreate = async () => {
    const trimmed = newExpName.trim();
    if (!trimmed) return;
    setCreating(true);
    try {
      const exp = await api.createExperiment({ name: trimmed });
      setExperiments((prev) => [exp, ...prev]);
      setNewExpName("");
      setShowCreateInput(false);
    } catch (err) {
      console.error("Failed to create experiment:", err);
    } finally {
      setCreating(false);
    }
  };

  return (
    <aside className="w-64 shrink-0 h-screen sticky top-0 flex flex-col bg-surface border-r border-border overflow-hidden">
      {/* Header */}
      <div className="px-4 py-4 border-b border-border flex items-center gap-2.5">
        <div className="w-7 h-7 rounded bg-[#8FAADC]/20 flex items-center justify-center shrink-0">
          <Beaker className="w-4 h-4 text-[#5077B8]" />
        </div>
        <div>
          <div className="font-semibold text-ink text-sm tracking-tight">ChemPlot</div>
          <div className="text-[10px] text-ink-muted font-mono">Electrochem Studio</div>
        </div>
      </div>

      {/* Experiments list */}
      <div className="flex-1 overflow-y-auto py-3 px-2 min-h-0">
        <div className="flex items-center justify-between px-2 mb-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
            Experiments
          </span>
          <button
            onClick={() => setShowCreateInput((v) => !v)}
            className="w-5 h-5 rounded flex items-center justify-center text-ink-muted hover:text-ink hover:bg-surface-sunken transition-colors"
            title="New experiment"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {showCreateInput && (
          <div className="px-2 mb-3">
            <input
              autoFocus
              type="text"
              value={newExpName}
              onChange={(e) => setNewExpName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
                if (e.key === "Escape") setShowCreateInput(false);
              }}
              placeholder="Experiment name..."
              className="w-full px-2.5 py-1.5 text-xs bg-surface-sunken text-ink border border-border rounded focus:outline-none focus:ring-1 focus:ring-accent-primary focus:border-accent-primary"
            />
            <div className="flex gap-1 mt-1">
              <button
                onClick={handleCreate}
                disabled={creating || !newExpName.trim()}
                className="flex-1 py-1 text-[10px] bg-[#8FAADC] text-white rounded hover:bg-[#7D9BCF] disabled:opacity-50 font-medium"
              >
                {creating ? "Creating..." : "Create"}
              </button>
              <button
                onClick={() => setShowCreateInput(false)}
                className="px-2 py-1 text-[10px] border border-border rounded hover:bg-surface-sunken text-ink-muted"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-8 text-ink-muted">
            <Loader2 className="w-4 h-4 animate-spin" />
          </div>
        ) : experiments.length === 0 ? (
          <div className="px-3 py-6 text-center">
            <FlaskConical className="w-8 h-8 text-border mx-auto mb-2" />
            <p className="text-xs text-ink-muted leading-snug">
              Upload your first Bio-Logic export to see it here.
            </p>
          </div>
        ) : (
          <nav className="space-y-0.5">
            {experiments.map((exp) => {
              const isActive = pathname === `/experiments/${exp.id}`;
              const runCount = exp.technique_runs?.length || 0;
              return (
                <Link
                  key={exp.id}
                  href={`/experiments/${exp.id}`}
                  className={cn(
                    "group flex items-center justify-between px-3 py-2 rounded text-xs transition-colors",
                    isActive
                      ? "bg-[#8FAADC]/15 text-ink font-medium border-l-2 border-[#8FAADC] pl-[10px]"
                      : "text-ink-muted hover:bg-surface-sunken hover:text-ink"
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FlaskConical className={cn("w-3.5 h-3.5 shrink-0", isActive ? "text-[#5077B8]" : "text-ink-muted")} />
                    <span className="truncate">{exp.name}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-1">
                    {runCount > 0 && (
                      <span className="text-[10px] font-mono text-ink-muted bg-surface-sunken px-1.5 py-0 rounded-full">
                        {runCount}
                      </span>
                    )}
                    {exp.sample_label && (
                      <span className="hidden group-hover:inline text-[10px] text-ink-muted truncate max-w-[60px]">
                        {exp.sample_label}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </nav>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-border px-4 py-3 text-[10px] text-ink-muted font-mono">
        v0 · CV · GCPL · PEIS
      </div>
    </aside>
  );
}
