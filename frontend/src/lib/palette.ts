/**
 * Colorblind-safe Okabe-Ito scientific palette.
 * Non-negotiable for scientific data presentation: decoupled from UI chrome tokens.
 */
export const OKABE_ITO = [
  "#000000", // Black
  "#E69F00", // Orange
  "#56B4E9", // Sky Blue
  "#009E73", // Bluish Green
  "#F0E442", // Yellow
  "#0072B2", // Blue
  "#D55E00", // Vermilion
  "#CC79A7", // Reddish Purple
];

export function getSeriesColor(index: number): string {
  return OKABE_ITO[index % OKABE_ITO.length];
}
