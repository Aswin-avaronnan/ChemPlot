import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatScientific(num: number | null | undefined, precision: number = 3): string {
  if (num === null || num === undefined) return "—";
  if (Math.abs(num) < 0.001 || Math.abs(num) >= 10000) {
    return num.toExponential(precision);
  }
  return num.toFixed(precision);
}
