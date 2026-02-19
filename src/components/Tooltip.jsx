import React from "react";
import { diseaseAccent } from "../utils/color";
import { featureToCountryMeta } from "../hooks/useMapboxGlobe";

export default function Tooltip({ visible, x, y, feature, disease, year, value }) {
  if (!visible || !feature) return null;

  const { name, iso3 } = featureToCountryMeta(feature);
  const accent = diseaseAccent(disease);

  const hasValue = value !== undefined && value !== null;
  const isZero = value === 0;
  const valueText = !hasValue ? "No data" : Number(value).toFixed(2);

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
        Value: <b>{isZero ? "0 (no burden)" : valueText}</b>
      </div>
    </div>
  );
}
