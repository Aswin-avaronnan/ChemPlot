import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", disabled, ...props }, ref) => {
    const base = "inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-accent-primary/40 disabled:opacity-50 disabled:pointer-events-none rounded";
    
    const variants = {
      primary: "bg-[#8FAADC] text-white hover:bg-[#7D9BCF] active:bg-[#6C8AC0]",
      secondary: "bg-surface-sunken text-ink hover:bg-[#E2E6EF] border border-border",
      outline: "bg-transparent text-ink border border-border hover:bg-surface-sunken",
      ghost: "bg-transparent text-ink hover:bg-surface-sunken",
      danger: "bg-[#E8A9A3] text-[#5C2320] hover:bg-[#DE9790]",
    };

    const sizes = {
      sm: "h-8 px-3 text-xs",
      md: "h-9 px-4 text-sm",
      lg: "h-11 px-6 text-base",
    };

    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(base, variants[variant], sizes[size], className)}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
