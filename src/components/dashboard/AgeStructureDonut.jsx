import React, { useMemo } from "react";
import { arc, pie } from "d3-shape";

// convert number -> unit to shorten
function compactPopulation(v) {
  if (!Number.isFinite(v)) {
    return "—";
  }
  const units = [
    { threshold: 1e9, suffix: "B" },
    { threshold: 1e6, suffix: "M" },
    { threshold: 1e3, suffix: "K" },
  ];

  for (const unit of units) {
    if (Math.abs(v) >= unit.threshold) {
      return `${(v / unit.threshold).toFixed(2)}${unit.suffix}`;
    }
  }

  return `${Math.round(v)}`;
}

// convert to %
function pct(v) {
  return Number.isFinite(v) ? `${v.toFixed(1)}%` : "—";
}

export default function AgeStructureDonut({ year, population, age0to14, age15to64, age65plus }) {
  //label
  const slices = useMemo(
    () => [
      { key: "0-14", value: Number(age0to14), color: "#3b82f6" },
      { key: "15-64", value: Number(age15to64), color: "#10b981" },
      { key: "65+", value: Number(age65plus), color: "#f59e0b" },
    ].filter((d) => Number.isFinite(d.value) && d.value >= 0),
    [age0to14, age15to64, age65plus]
  );

  if (!slices.length) {
    return <div className="dashAgeEmpty">No age-group data.</div>;
  }

  const w = 340;
  const h = 280;
  const outerR = 92;
  const innerR = 52;
  const cx = w / 2;
  const cy = h / 2;

  const pieGen = pie().sort(null).value((d) => d.value);
  const arcs = pieGen(slices);
  const arcGen = arc().innerRadius(innerR).outerRadius(outerR);
  const labelLineArc = arc().innerRadius(outerR - 1).outerRadius(outerR - 1);
  const labelAnchorArc = arc().innerRadius(outerR + 18).outerRadius(outerR + 18);

  return (
    <section className="dashAgeDonutCard">
      <div className="dashAgeDonutTitle">
        Age Structure{Number.isFinite(year) ? ` (${year})` : ""}
      </div>

      <div className="dashAgeDonutWrap">
        <svg viewBox={`0 0 ${w} ${h}`} className="dashAgeDonutSvg" role="img" aria-label="Age structure donut">
          <g transform={`translate(${cx}, ${cy})`}>
            {arcs.map((a) => (
              <path key={a.data.key} d={arcGen(a) || ""} fill={a.data.color} stroke="#fff" strokeWidth={1.2} />
            ))}
            {arcs.map((a) => {
              const m = (a.startAngle + a.endAngle) / 2;
              const edge = labelLineArc.centroid(a);
              const anchor = labelAnchorArc.centroid(a);
              const is65Plus = a.data.key === "65+";
              const direction = is65Plus ? -1 : Math.cos(m) >= 0 ? 1 : -1;
              const x = is65Plus ? -(outerR + 18) : anchor[0];
              const y = is65Plus ? edge[1] - 4 : anchor[1];
              const elbowX = x + 9 * direction;
              const anchorMode = direction > 0 ? "start" : "end";
              const tx = x + direction * 2;

              return (
                <g key={`label-${a.data.key}`}>
                  <polyline
                    className="dashAgeSliceConnector"
                    style={{ stroke: a.data.color }}
                    points={`${edge[0]},${edge[1]} ${elbowX},${y} ${x},${y}`}
                  />
                  <text
                    x={tx}
                    y={y}
                    className="dashAgeSliceLabel"
                    style={{ fill: a.data.color }}
                    textAnchor={anchorMode}
                  >
                    <tspan x={tx} dy="-0.18em">{`Age ${a.data.key}`}</tspan>
                    <tspan x={tx} dy="1.12em">{pct(a.data.value)}</tspan>
                  </text>
                </g>
              );
            })}
          </g>
        </svg>

        <div className="dashAgeDonutCenter">
          <div className="dashAgeDonutCenterValue">{compactPopulation(population)}</div>
          <div className="dashAgeDonutCenterLabel">Population</div>
        </div>
      </div>
    </section>
  );
}
