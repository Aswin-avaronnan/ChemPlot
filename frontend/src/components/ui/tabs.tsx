import * as React from "react";
import { cn } from "@/lib/utils";

export interface TabsProps {
  value: string;
  onValueChange: (val: string) => void;
  tabs: { value: string; label: string; count?: number }[];
  className?: string;
}

export function Tabs({ value, onValueChange, tabs, className }: TabsProps) {
  return (
    <div className={cn("flex items-center gap-1 border-b border-border bg-transparent", className)}>
      {tabs.map((tab) => {
        const isActive = tab.value === value;
        return (
          <button
            key={tab.value}
            onClick={() => onValueChange(tab.value)}
            className={cn(
              "px-3 py-2 text-xs font-medium border-b-2 -mb-px transition-colors flex items-center gap-1.5",
              isActive
                ? "border-accent-primary text-ink font-semibold"
                : "border-transparent text-ink-muted hover:text-ink hover:border-border"
            )}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={cn(
                  "px-1.5 py-0.2 rounded-full text-[10px] font-mono",
                  isActive ? "bg-accent-primary/20 text-[#2B4B7E]" : "bg-surface-sunken text-ink-muted"
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
