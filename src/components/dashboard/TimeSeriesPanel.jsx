import React, { useMemo } from "react";
import { buildSparkPath } from "../../utils/sparkline";

function nearestYear(series, targetYear) {
    if (!Number.isFinite(targetYear)) return null;
    let bestYear = null;
    let bestDist = Infinity;

    for (const p of series) {
      if (!Number.isFinite(p.year)) continue;
      const dist = Math.abs(p.year - targetYear);
      if (dist < bestDist) {
        bestDist = dist;
        bestYear = p.year;
      }
    }

    return bestYear;
}

function getPointAtYear(series, year) {
    if (!Number.isFinite(year)) return null;

    for (const p of series) {
      if (p.year === year && Number.isFinite(p.value)) return p;
    }

    return null;
}

function valueAtNearestYear(series, year) {

  const y = nearestYear(series, year);
  if (!Number.isFinite(y)) return null;
  const p = getPointAtYear(series, y);

  return p ? p.value : null;
}

function formatDelta(v, formatter) {

  if (!Number.isFinite(v)) return "—";
  const sign = v > 0 ? "+" : "";
  const body = formatter ? formatter(v) : v.toFixed(2);

  return `${sign}${body}`;
}

function formatValue(v, formatter) {

  if (!Number.isFinite(v)) return "—";
  return formatter ? formatter(v) : v.toFixed(2);
}

function withUnit(text, unitLabel) {

  if (!unitLabel || text === "—") return text;
  return `${text} ${unitLabel}`;
}

export default function TimeSeriesPanel({
    title,
    subtitle = "",
    series,
    rangeStart,
    rangeEnd,
    hoverYear,
    onHoverYear,
    accent = "#2563eb",
    valueFormatter,
    unitLabel = "",
}) {
  const w = 520;
  const h = 220;
  const padL = 44;
  const padR = 16;
  const padT = 16;
  const padB = 30;

  const finite = useMemo(
    () => series.filter((d) => Number.isFinite(d.year) && Number.isFinite(d.value)),
    [series]
  );

  if (!finite.length) {
    return (
      <section className="dashChartCard">
        <div className="dashChartHead">
          <div className="dashChartTitle">{title}</div>
          <div className="small">{subtitle}</div>
        </div>
        <div className="dashEmpty">No data in this range.</div>
      </section>
    );
  }

  const xMin = Math.min(...series.map((d) => d.year));
  const xMax = Math.max(...series.map((d) => d.year));
  const dataMin = Math.min(...finite.map((d) => d.value));
  const dataMax = Math.max(...finite.map((d) => d.value));
  const yMin = Math.min(0, dataMin);
  const yMax = Math.max(0, dataMax);

  const xScale = (x) =>
    padL + ((x - xMin) / Math.max(1, xMax - xMin)) * (w - padL - padR);

  const yScale = (y) =>
    h - padB - ((y - yMin) / Math.max(1e-9, yMax - yMin)) * (h - padT - padB);

  const path = buildSparkPath(series, xScale, yScale);
  const effectiveEnd = Number.isFinite(hoverYear) ? hoverYear : rangeEnd;
  const point = getPointAtYear(series, effectiveEnd);
  const startValue = valueAtNearestYear(series, rangeStart);
  const endValue = valueAtNearestYear(series, effectiveEnd);
  const rangeDelta =
    Number.isFinite(startValue) && Number.isFinite(endValue) ? endValue - startValue : null;

  const handleMove = (e) => {
    if (!onHoverYear) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const t = (x - padL) / Math.max(1, rect.width - padL - padR);
    const rawYear = xMin + t * (xMax - xMin);
    const y = nearestYear(series, Math.round(rawYear));
    onHoverYear(y);
  };

  return (
    <section className="dashChartCard">
      <div className="dashChartHead">
        <div>
          <div className="dashChartTitle">{title}</div>
          <div className="small">{subtitle}</div>
        </div>
        <div className="dashChartStat">
          <div className="dashChartStatValue" style={{ color: accent }}>
            {withUnit(formatDelta(rangeDelta, valueFormatter), unitLabel)}
          </div>
          <div className="dashChartStatDelta">
            <div>
              Min ({rangeStart}): {withUnit(formatValue(startValue, valueFormatter), unitLabel)}
            </div>
            <div>
              Max ({effectiveEnd}): {withUnit(formatValue(endValue, valueFormatter), unitLabel)}
            </div>
          </div>
        </div>
      </div>

      <svg viewBox={`0 0 ${w} ${h}`} className="dashChartSvg">
        <line x1={padL} y1={h - padB} x2={w - padR} y2={h - padB} className="dashAxis" />
        <line x1={padL} y1={padT} x2={padL} y2={h - padB} className="dashAxis" />

        <line x1={padL} y1={(padT + h - padB) / 2} x2={w - padR} y2={(padT + h - padB) / 2} className="dashGrid" />

        <path d={path} fill="none" stroke={accent} strokeWidth="3" />

        {Number.isFinite(rangeStart) && Number.isFinite(effectiveEnd) ? (
          <rect
            x={xScale(Math.min(rangeStart, effectiveEnd))}
            y={padT}
            width={Math.max(1, xScale(Math.max(rangeStart, effectiveEnd)) - xScale(Math.min(rangeStart, effectiveEnd)))}
            height={h - padT - padB}
            fill={accent}
            opacity="0.08"
          />
        ) : null}

        {Number.isFinite(rangeStart) ? (
          <line
            x1={xScale(rangeStart)}
            y1={padT}
            x2={xScale(rangeStart)}
            y2={h - padB}
            className="dashRangeLine"
          />
        ) : null}

        {Number.isFinite(effectiveEnd) ? (
          <line
            x1={xScale(effectiveEnd)}
            y1={padT}
            x2={xScale(effectiveEnd)}
            y2={h - padB}
            className="dashFocusLine"
          />
        ) : null}

        {point ? (
          <circle cx={xScale(point.year)} cy={yScale(point.value)} r="4.8" fill={accent} />
        ) : null}

        <text x={padL} y={h - 10} className="dashTickText">
          {xMin}
        </text>
        <text x={w - padR} y={h - 10} textAnchor="end" className="dashTickText">
          {xMax}
        </text>
        <text x={padL - 6} y={padT + 4} textAnchor="end" className="dashTickText">
          {valueFormatter ? valueFormatter(yMax) : yMax.toFixed(2)}
        </text>
        <text x={padL - 6} y={h - padB + 4} textAnchor="end" className="dashTickText">
          {valueFormatter ? valueFormatter(yMin) : yMin.toFixed(2)}
        </text>

        <text
          x={xScale(rangeStart)}
          y={h - 12}
          textAnchor="middle"
          className="dashRangeText"
        >
          {rangeStart}
        </text>
        <text
          x={xScale(effectiveEnd)}
          y={h - 12}
          textAnchor="middle"
          className="dashRangeText"
        >
          {effectiveEnd}
        </text>

        <rect
          x={padL}
          y={padT}
          width={w - padL - padR}
          height={h - padT - padB}
          fill="transparent"
          onMouseMove={handleMove}
          onMouseLeave={() => onHoverYear?.(null)}
        />
      </svg>
    </section>
  );
}
