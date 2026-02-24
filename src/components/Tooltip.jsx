import React from "react";
import { diseaseAccent } from "../utils/color";
import { featureToCountryMeta } from "../hooks/useMapboxGlobe";

function formatValue(value, metric) {
  if (value === undefined || value === null || !Number.isFinite(Number(value))) {
    return "No data";
  }
  const v = Number(value);

  if (metric === "number") {
    return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(v);
  }

  return v.toFixed(2);
}

export default function Tooltip({
  visible,
  x,
  y,
  feature,
  disease,
  year,
  value,
  metric,
}) {
  if (!visible || !feature) return null;

  const { name, iso3 } = featureToCountryMeta(feature);
  const accent = diseaseAccent(disease);

  const isZero = value === 0;
  const valueText = formatValue(value, metric);

  return (
    <div className="tooltip" style={{ left: x + 12, top: y + 12 }}>
      <div style={{ fontWeight: 700 }}>{name}</div>
      <div style={{ opacity: 0.9 }}>
        <span
          style={{
            display: "inline-block",
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: accent,
            marginRight: 6,
            verticalAlign: "middle",
          }}
        />
        {iso3} • {disease} • {year}
      </div>
      <div style={{ marginTop: 6 }}>
        {metric === "number" ? "Number" : "Rate"}:{" "}
        <b>{isZero ? "0 (no burden)" : valueText}</b>
      </div>
    </div>
  );
}