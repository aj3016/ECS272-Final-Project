export const NO_DATA = "#e5e7eb";
export const ZERO = "#f3f4f6";

export const PALETTES = {
  blue: ["#f3f4f6", "#dbeafe", "#93c5fd", "#60a5fa", "#2563eb"],
  red: ["#f3f4f6", "#fee2e2", "#fca5a5", "#f87171", "#ef4444"],
  purple: ["#f3f4f6", "#ede9fe", "#c4b5fd", "#a78bfa", "#7c3aed"],
  green: ["#f3f4f6", "#dcfce7", "#86efac", "#4ade80", "#22c55e"],
};

export function getPalette(name) {
  return PALETTES[name] || PALETTES.blue;
}