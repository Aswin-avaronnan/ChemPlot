import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "neutral" | "success" | "warning" | "danger" | "primary";
}

export function Badge({ className, variant = "neutral", ...props }: BadgeProps) {
  const variants = {
    neutral: "bg-surface-sunken text-ink-muted border-border",
    primary: "bg-[#8FAADC]/20 text-[#2B4B7E] border-[#8FAADC]/40",
    success: "bg-[#A7D8C5]/30 text-[#1F543F] border-[#A7D8C5]/60",
    warning: "bg-[#F2C98E]/30 text-[#6B4715] border-[#F2C98E]/60",
    danger: "bg-[#E8A9A3]/30 text-[#692923] border-[#E8A9A3]/60",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono border font-medium",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
