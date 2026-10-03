import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, helperText, error, id, ...props }, ref) => {
    const inputId = id || React.useId();

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-medium text-ink-muted mb-1">
            {label}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          className={cn(
            "w-full px-3 py-1.5 text-sm bg-surface text-ink border rounded transition-colors focus:outline-none focus:ring-1 focus:ring-accent-primary focus:border-accent-primary",
            error ? "border-accent-danger text-accent-danger" : "border-border",
            className
          )}
          {...props}
        />
        {error ? (
          <p className="text-xs text-accent-danger mt-1">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-ink-muted mt-1">{helperText}</p>
        ) : null}
      </div>
    );
  }
);
Input.displayName = "Input";
