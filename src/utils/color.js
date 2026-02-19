export const diseaseColors = {
  Measles: "#ef4444",
  Malaria: "#f59e0b",
  Dengue: "#a855f7",
  "Lower respiratory infections": "#10b981",
  "HIV/AIDS and sexually transmitted infections": "#ec4899",
};

export function diseaseAccent(disease) {
  return diseaseColors[disease] || "#111827";
}
