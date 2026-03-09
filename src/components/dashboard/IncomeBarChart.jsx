import React, { useMemo } from "react";
import { max } from "d3-array";
import { scaleBand, scaleLinear } from "d3-scale";


// shorten number -> unit
function compactUsd(value) {
  if (!Number.isFinite(value)) {
    return "—";
  }

  const units = [
    { threshold: 1e9, suffix: "B" },
    { threshold: 1e6, suffix: "M" },
    { threshold: 1e3, suffix: "K" },
  ];

  for (const unit of units) {
    if (Math.abs(value) >= unit.threshold) {
      return `$${(value / unit.threshold).toFixed(2)}${unit.suffix}`;
    }
  }

  return `$${Math.round(value)}`;
}

//shorten number on axis label ->  unit
function axisTick(value) {
  if (!Number.isFinite(value)) return "";
  if (Math.abs(value) >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (Math.abs(value) >= 1e3) return `${Math.round(value / 1e3)}K`;
  return `${Math.round(value)}`;
}

const CLASS_COLORS = {
  High: "#2563eb",
  "Upper-middle": "#0d9488",
  "Lower-middle": "#ca8a04",
  Low: "#dc2626",
  Unclassified: "#64748b",
  Other: "#64748b",
};

export default function IncomeBarChart({ series, selectedYear, onSelectYear }) {
  const data = useMemo(() => {
    const source = Array.isArray(series) ? series : [];
    return source
      .filter((d) => Number.isFinite(d.year) && Number.isFinite(d.value))
      .sort((a, b) => a.year - b.year);
  }, [series]);
  if (!data.length) {
    return <div className="dashIncomeEmpty">No national income data.</div>;
  }

  const fallbackYear = data[data.length - 1].year;
  let nearestSelectedYear = fallbackYear;
  if (Number.isFinite(selectedYear)) {
    nearestSelectedYear = data.reduce((best, d) => {
      if (!Number.isFinite(best)) return d.year;
      return Math.abs(d.year - selectedYear) < Math.abs(best - selectedYear) ? d.year : best;
    }, Number.NaN);
  }
  const selected = data.find((d) => d.year === nearestSelectedYear) || data.find((d) => d.year === fallbackYear);
  const w = 420;
  const h = 180;
  const padL = 35;
  const padR = 12;
  const padT = 10;
  const padB = 16;
  const maxVal = max(data, (d) => d.value) || 0;
  const plotH = h - padT - padB;
  const years = data.map((d) => d.year);
  const x = scaleBand()
    .domain(years.map(String))
    .range([padL, w - padR])
    .paddingInner(0.15)
    .paddingOuter(0.05);
  const y = scaleLinear()
    .domain([0, Math.max(1, maxVal)])
    .range([h - padB, padT]);

  const yTicks = [0, 0.5, 1].map((t) => t * maxVal);

  return (
    <section className="dashIncomeBarCard">
      <div className="dashIncomeBarTitle">Gross National Income (GNI) per person</div>
      <div className="dashIncomeBarMeta">
        <span className="dashIncomeYearPill">Year {selected.year}</span>
        <strong>{compactUsd(selected.value)}</strong>
        <span>{`${selected.incomeGroup || "No data found"} (class)`}</span>
      </div>

      <svg viewBox={`0 0 ${w} ${h}`} className="dashIncomeBarSvg" role="img" aria-label="National income bar chart">
        <line x1={padL} y1={padT} x2={padL} y2={h - padB} className="dashAxis" />
        <line x1={padL} y1={h - padB} x2={w - padR} y2={h - padB} className="dashAxis" />
        {yTicks.map((tick) => {
          const y = h - padB - (tick / Math.max(1, maxVal)) * plotH;
          return (
            <g key={`y-${tick}`}>
              <line x1={padL - 4} y1={y} x2={padL} y2={y} className="dashAxis" />
              <text x={padL - 6} y={y + 3} textAnchor="end" className="dashIncomeTick">
                {axisTick(tick)}
              </text>
            </g>
          );
        })}
        {/* select year */}
        {data.map((d) => {
          const xPos = x(String(d.year)) ?? padL;
          const yPos = y(d.value);
          const bh = Math.max(1, h - padB - yPos);
          const color = CLASS_COLORS[d.classification] || CLASS_COLORS.Unclassified;
          const isSelected = selected.year === d.year;
          return (
            <rect
              key={d.year}
              x={xPos}
              y={yPos}
              width={Math.max(1, x.bandwidth())}
              height={bh}
              fill={color}
              opacity={isSelected ? 1 : 0.64}
              stroke={isSelected ? "#0f172a" : "transparent"}
              strokeWidth={isSelected ? 2 : 0}
              style={{ cursor: "default" }}
              onMouseEnter={() => {
                if (typeof onSelectYear === "function") {
                  onSelectYear(d.year);
                }
              }}
            />
          );
        })}

        <text x={padL} y={h - 3} className="dashIncomeTick">{years[0]}</text>
        <text x={w - padR} y={h - 3} textAnchor="end" className="dashIncomeTick">{years[years.length - 1]}</text>
      </svg>

      <div className="dashIncomeLegend">
        {Object.entries(CLASS_COLORS).slice(0, 4).map(([k, c]) => (
          <span key={k} className="dashIncomeLegendItem">
            <i style={{ background: c }} />
            {k}
          </span>
        ))}
      </div>
    </section>
  );
}
