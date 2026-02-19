export function computeThresholds(valuesByDiseaseYear, disease, year) {
  const d = valuesByDiseaseYear?.[disease];
  if (!d || !d[year]) return null;

  const vals = Object.values(d[year]).filter(
    (v) => Number.isFinite(v) && v > 0
  );
  if (vals.length < 10) return null;

  vals.sort((a, b) => a - b);
  const q = (p) => vals[Math.floor((vals.length - 1) * p)];
  return [q(0.2), q(0.4), q(0.6), q(0.8)];
}

export function buildFillExpression(thresholds) {
  const NO_DATA = "#e5e7eb";
  const ZERO = "#f3f4f6";

  if (!thresholds) {
    return [
      "case",
      ["!", ["has", "value"]],
      NO_DATA,
      ["==", ["get", "value"], 0],
      ZERO,
      "#2563eb",
    ];
  }

  const [t1, t2, t3, t4] = thresholds;
  return [
    "case",
    ["!", ["has", "value"]],
    NO_DATA,
    ["==", ["get", "value"], 0],
    ZERO,
    ["<", ["get", "value"], t1],
    "#dbeafe",
    ["<", ["get", "value"], t2],
    "#93c5fd",
    ["<", ["get", "value"], t3],
    "#60a5fa",
    ["<", ["get", "value"], t4],
    "#2563eb",
    "#1e40af",
  ];
}
