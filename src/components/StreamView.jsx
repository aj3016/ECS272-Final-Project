import { useState } from "react";
import StreamGraph from "./StreamGraph";

const DISEASE_GROUPS = {
  all: {
    label: "All diseases (overview)",
    diseases: null,
    scale: "symlog",
  },
  high: {
    label: "High-volume diseases",
    diseases: [
      "COVID-19",
      "Lower respiratory infections",
      "HIV/AIDS",
      "Measles",
      "Malaria",
    ],
    scale: "linear",
  },
  low: {
    label: "Lower-volume outbreaks",
    diseases: [
      "Ebola",
      "Dengue",
      // "Malaria",
    ],
    scale: "linear",
  },
};

export default function StreamView({ onDiseaseSelect }) {
  const [mode, setMode] = useState("all");

  const config = DISEASE_GROUPS[mode];

  return (
    <div style={{ width: 900, margin: "0 auto" }}>
      {/* Header + control */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 600 }}>
          Global disease mortality (1980–2023)
        </div>

        <select
          value={mode}
          onChange={(e) => setMode(e.target.value)}
          style={{ fontSize: 13, padding: "4px 6px" }}
        >
          {Object.entries(DISEASE_GROUPS).map(([key, cfg]) => (
            <option key={key} value={key}>
              {cfg.label}
            </option>
          ))}
        </select>
      </div>

      {/* Clarification text (prevents misleading interpretation) */}
      {mode === "all" && (
        <div style={{ fontSize: 12, color: "#444", marginBottom: 6 }}>
          Note: Y-axis uses a symmetric log scale to show both large-scale
          pandemics and smaller outbreaks in a single view.
        </div>
      )}

      {/* The ONE stream graph */}
      <StreamGraph 
        onDiseaseSelect={onDiseaseSelect}
        diseases={config.diseases}
        yScale={config.scale}
      />
    </div>
  );
}