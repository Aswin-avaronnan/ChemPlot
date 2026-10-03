import * as React from "react";
import { cn } from "@/lib/utils";

// ─── Table shell ────────────────────────────────────────────────────────────

export interface TableProps extends React.HTMLAttributes<HTMLTableElement> {
  /** When true, adds a thin border around the entire table */
  bordered?: boolean;
}

export function Table({ className, bordered = false, ...props }: TableProps) {
  return (
    <div className={cn("w-full overflow-x-auto", bordered ? "border border-border rounded" : "")}>
      <table
        className={cn("w-full text-xs border-collapse", className)}
        {...props}
      />
    </div>
  );
}

// ─── Table sub-components ────────────────────────────────────────────────────

export function TableHead({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={cn("bg-surface-sunken border-b border-border", className)}
      {...props}
    />
  );
}

export function TableBody({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn("divide-y divide-border/50", className)} {...props} />;
}

export function TableRow({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        "transition-colors hover:bg-surface-sunken/60",
        className
      )}
      {...props}
    />
  );
}

export interface TableHeadCellProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  align?: "left" | "center" | "right";
}

export function TableHeadCell({
  className,
  align = "left",
  ...props
}: TableHeadCellProps) {
  return (
    <th
      className={cn(
        "px-3 py-2 font-medium text-ink-muted whitespace-nowrap",
        align === "center" && "text-center",
        align === "right" && "text-right",
        className
      )}
      {...props}
    />
  );
}

export interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  align?: "left" | "center" | "right";
  mono?: boolean;
}

export function TableCell({
  className,
  align = "left",
  mono = false,
  ...props
}: TableCellProps) {
  return (
    <td
      className={cn(
        "px-3 py-2 text-ink",
        align === "center" && "text-center",
        align === "right" && "text-right",
        mono && "font-mono",
        className
      )}
      {...props}
    />
  );
}
