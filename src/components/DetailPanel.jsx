import React, { useMemo } from "react";
import { diseaseAccent } from "../utils/color";
import { buildSparkPath } from "../utils/sparkline";
import { featureToCountryMeta } from "../hooks/useMapboxGlobe";

function getSeries(valuesByMetricDiseaseYear, metric, years, iso3, disease) {
  const byMetric = valuesByMetricDiseaseYear?.[metric];
  const d = byMetric?.[disease];
  if (!d) return [];
  return years.map((y) => {
    const v = d[y]?.[iso3];
    return { year: y, value: v === undefined ? null : v };
  });
}

function formatYAxisLabel(v, metric) {
  if (!Number.isFinite(v)) return "";
  if (metric === "number") {
    if (v >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
    if (v >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
    if (v >= 1e3) return `${(v / 1e3).toFixed(2)}K`;
    return `${Math.round(v)}`;
  }
  return v.toFixed(2);
}

function Sparkline({ series, selectedYear, accent, metric }) {
  const w = 340;
  const h = 150;
  const pad = 18;

  const xs = series.map((d) => d.year);
  const ys = series.map((d) => d.value).filter((v) => v !== null);

  if (ys.length < 2) {
    return (
      <div style={{ fontSize: 12, color: "#666" }}>
        Not enough data to plot.
      </div>
    );
  }

  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yMin = Math.min(...ys);
  const yMax = Math.max(...ys);

  const xScale = (x) =>
    pad + (w - 2 * pad) * ((x - xMin) / (xMax - xMin || 1));

  const yScale = (y) =>
    h - pad - (h - 2 * pad) * ((y - yMin) / (yMax - yMin || 1));

  const path = buildSparkPath(series, xScale, yScale);

  const sel = series.find((d) => d.year === selectedYear);
  const selHas = sel && sel.value !== null;

  return (
    <svg width={w} height={h} style={{ display: "block" }}>
      <path d={path} fill="none" stroke={accent} strokeWidth="2" />
      {selHas ? (
        <circle
          cx={xScale(sel.year)}
          cy={yScale(sel.value)}
          r="3.5"
          fill={accent}
        />
      ) : null}

      <text x={pad} y={h - 6} fontSize="10" fill="#666">
        {xMin}
      </text>
      <text x={w - pad} y={h - 6} fontSize="10" fill="#666" textAnchor="end">
        {xMax}
      </text>
      <text x={pad} y={pad - 6} fontSize="10" fill="#666">
        {formatYAxisLabel(yMax, metric)}
      </text>
      <text x={pad} y={h - pad + 12} fontSize="10" fill="#666">
        {formatYAxisLabel(yMin, metric)}
      </text>
    </svg>
  );
}

export default function DetailPanel({
  open,
  feature,
  selectedDisease,
  selectedYear,
  years,
  valuesByMetricDiseaseYear,
  metric,
  onClose,
  onOpenDashboard
}) {
  const meta = useMemo(() => featureToCountryMeta(feature), [feature]);
  const accent = diseaseAccent(selectedDisease);

  const series = useMemo(() => {
    if (!meta.iso3) return [];
    return getSeries(
      valuesByMetricDiseaseYear,
      metric,
      years,
      meta.iso3,
      selectedDisease
    );
  }, [valuesByMetricDiseaseYear, metric, years, meta.iso3, selectedDisease]);

  if (!open || !feature || !meta.iso3) return null;

  return (
    <div className="detailPanel">
      <div className="detailHeader">
        <div>
          <div style={{ fontWeight: 700 }}>{meta.name}</div>
          <div style={{ fontSize: 12, color: "#444", marginTop: 4 }}>
            ISO3: {meta.iso3}
          </div>
        </div>
        <button className="closeBtn" onClick={onClose}>
          ✕
        </button>
      </div>

      <div style={{ marginTop: 10, fontSize: 12, color: "#333" }}>
        Disease: <b>{selectedDisease}</b>
      </div>

      <div style={{ marginTop: 6, fontSize: 12, color: "#333" }}>
        Metric: <b>{metric === "number" ? "Number" : "Rate"}</b>
      </div>

      <div style={{ marginTop: 10 }}>
        <Sparkline
          series={series}
          selectedYear={selectedYear}
          accent={accent}
          metric={metric}
        />
      </div>

      <div className="small" style={{ marginTop: 8 }}>
        Tip: change disease/year/metric and the drill-down updates automatically.
      </div>
      {onOpenDashboard ? (
        <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={() => onOpenDashboard(meta.iso3)}
            style={{
              padding: "8px 10px",
              borderRadius: 10,
              border: "1px solid rgba(37,99,235,0.45)",
              background: "white",
              cursor: "pointer",
              boxShadow: "0 10px 24px rgba(37,99,235,0.12)",
            }}
          >
            Open Full Dashboard →
          </button>
        </div>
      ) : null}
    </div>
  );
}