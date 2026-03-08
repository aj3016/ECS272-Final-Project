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
      "Influenza",
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
    ],
    scale: "linear",
  },
};

export default function StreamView({ onDiseaseSelect }) {
  const [mode, setMode] = useState("all");

  const config = DISEASE_GROUPS[mode];

  return (
    <div style={{
  width: "100%",
  margin: "0 auto"
}}>
      {/* Header + control */}
      <div
        style={{
          display: "flex",
          gap: 10,
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
          style={{ fontSize: 13, padding: "4px 6px", maxWidth: 220,}}
        >
          {Object.entries(DISEASE_GROUPS).map(([key, cfg]) => (
            <option key={key} value={key}>
              {cfg.label}
            </option>
          ))}
        </select>
      </div>

      {/* Clarification text (prevents misleading interpretation) */}
      {<div style={{ fontSize: 12, color: "#444", marginBottom: 6 }}>
          Hover over both charts to explore yearly values. Use the dropdown to focus on major or smaller outbreaks.
        </div>
      }

      {/* The ONE stream graph */}
      <StreamGraph 
        onDiseaseSelect={onDiseaseSelect}
        diseases={config.diseases}
        yScale={config.scale}
      />
    </div>
  );
}