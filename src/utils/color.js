export const diseaseColors = {
  Measles: "#ef4444",
  Malaria: "#f59e0b",
  Dengue: "#a855f7",
  "Influenza": "#10b981",
  "HIV/AIDS": "#ec4899",
  "COVID-19": "#768233",
};

export function diseaseAccent(disease) {
  return diseaseColors[disease] || "#111827";
}
