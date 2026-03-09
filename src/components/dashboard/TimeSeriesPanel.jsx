import React, { useMemo, useState } from "react";
import { buildSparkPath } from "../../utils/sparkline";

function nearestYear(series, targetYear) {
  if (!Number.isFinite(targetYear)) {
    return null;
  }

  let bestYear = null;
  let bestDist = Infinity;

  for (const point of series) {
    if (!Number.isFinite(point.year)) {
      continue;
    }
    const dist = Math.abs(point.year - targetYear);
    if (dist < bestDist) {
      bestDist = dist;
      bestYear = point.year;
    }
  }

  return bestYear;
}

function getPointAtYear(series, year) {
  if (!Number.isFinite(year)) {
    return null;
  }

  for (const point of series) {
    if (point.year === year && Number.isFinite(point.value)) {
      return point;
    }
  }

  return null;
}

function valueAtNearestYear(series, year) {
  const nearest = nearestYear(series, year);
  if (!Number.isFinite(nearest)) {
    return null;
  }

  const point = getPointAtYear(series, nearest);
  if (!point) {
    return null;
  }

  return point.value;
}

function formatDelta(value, formatter) {
  if (!Number.isFinite(value)) {
    return "—";
  }

  const sign = value > 0 ? "+" : "";
  const body = formatter ? formatter(value) : value.toFixed(2);
  return `${sign}${body}`;
}

function formatValue(value, formatter) {
  if (!Number.isFinite(value)) {
    return "—";
  }
  if (formatter) {
    return formatter(value);
  }
  return value.toFixed(2);
}

function withUnit(text, unitLabel) {
  if (!unitLabel || text === "—") {
    return text;
  }
  return `${text} ${unitLabel}`;
}

function countryValueLine(year, value, formatter, unitLabel, accent) {
  return (
    <div>
      {year}: <span style={{ color: accent, fontWeight: 700 }}>{withUnit(formatValue(value, formatter), unitLabel)}</span>
    </div>
  );
}

export default function TimeSeriesPanel({
  title,
  subtitle = "",
  series,
  referenceSeries = null,
  contextCountry = "",
  contextDisease = "",
  rangeStart,
  rangeEnd,
  hoverYear,
  onHoverYear,
  accent = "#2563eb",
  valueFormatter,
  unitLabel = "",
  layout = "default",
  enableBrush = false,
  onBrushRangeChange = null,
  compactFooter = null,
  panelRef = null,
}) {
  const isRightCompact = layout === "rightCompact";
  const width = 530;
  const height = isRightCompact ? 210 : 220;
  const padL = 44;
  const padR = 16;
  const padT = isRightCompact ? 10 : 16;
  const padB = isRightCompact ? 16 : 20;
  const [dragStartYear, setDragStartYear] = useState(null);

  const finite = useMemo(() => {
    return series.filter((point) => Number.isFinite(point.year) && Number.isFinite(point.value));
  }, [series]);

  const referenceFinite = useMemo(() => {
    const source = Array.isArray(referenceSeries) ? referenceSeries : [];
    return source.filter((point) => Number.isFinite(point.year) && Number.isFinite(point.value));
  }, [referenceSeries]);

  if (!finite.length) {
    return (
      <section className="dashChartCard">
        <div className="dashChartHead">
          <div>
            <div className="dashChartTitle">{title}</div>
            <div className="small">{subtitle}</div>
            <div className="dashPanelScopeRow">
              {contextCountry ? <span className="dashPanelScopeChip">Country: {contextCountry}</span> : null}
              {contextDisease ? <span className="dashPanelScopeChip">Disease: {contextDisease}</span> : null}
            </div>
          </div>
        </div>
        <div className="dashEmpty">No data in this range.</div>
      </section>
    );
  }

  const xMin = Math.min(...series.map((d) => d.year));
  const xMax = Math.max(...series.map((d) => d.year));

  const allFinite = [...finite, ...referenceFinite];
  const dataMin = Math.min(...allFinite.map((d) => d.value));
  const dataMax = Math.max(...allFinite.map((d) => d.value));
  const yMin = Math.min(0, dataMin);
  const yMax = Math.max(0, dataMax);

  const xScale = (x) => {
    return padL + ((x - xMin) / Math.max(1, xMax - xMin)) * (width - padL - padR);
  };

  const yScale = (y) => {
    return height - padB - ((y - yMin) / Math.max(1e-9, yMax - yMin)) * (height - padT - padB);
  };

  const path = buildSparkPath(series, xScale, yScale);

  let referencePath = "";
  if (referenceSeries && referenceSeries.length) {
    referencePath = buildSparkPath(referenceSeries, xScale, yScale);
  }

  const rangeWidthYears = Math.max(1, Number(rangeEnd) - Number(rangeStart));
  const maxStartYear = Math.max(xMin, xMax - rangeWidthYears);
  let effectiveStart = rangeStart;
  if (Number.isFinite(hoverYear)) {
    const clampedHover = Math.max(xMin, Math.min(maxStartYear, hoverYear));
    effectiveStart = nearestYear(series, clampedHover);
  }

  let effectiveEnd = rangeEnd;
  if (Number.isFinite(effectiveStart)) {
    effectiveEnd = nearestYear(series, effectiveStart + rangeWidthYears);
  }
  const point = getPointAtYear(series, effectiveEnd);

  const startValue = valueAtNearestYear(series, effectiveStart);
  const endValue = valueAtNearestYear(series, effectiveEnd);

  let rangeDelta = null;
  if (Number.isFinite(startValue) && Number.isFinite(endValue)) {
    rangeDelta = endValue - startValue;
  }

  const safeReferenceSeries = Array.isArray(referenceSeries) ? referenceSeries : [];
  const avgStartValue = valueAtNearestYear(safeReferenceSeries, effectiveStart);
  const avgEndValue = valueAtNearestYear(safeReferenceSeries, effectiveEnd);

  let avgDelta = null;
  if (Number.isFinite(avgStartValue) && Number.isFinite(avgEndValue)) {
    avgDelta = avgEndValue - avgStartValue;
  }

  function notifyHover(year) {
    if (typeof onHoverYear === "function") {
      onHoverYear(year);
    }
  }

  function handleMove(event) {
    if (!onHoverYear && !enableBrush) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const xView = (x / Math.max(1, rect.width)) * width;
    const t = (xView - padL) / Math.max(1, width - padL - padR);
    const rawYear = xMin + t * (xMax - xMin);
    const year = nearestYear(series, Math.round(rawYear));

    notifyHover(year);

    if (enableBrush && Number.isFinite(dragStartYear) && Number.isFinite(year) && typeof onBrushRangeChange === "function") {
      onBrushRangeChange(dragStartYear, year);
    }
  }

  function handleDown(event) {
    if (!enableBrush) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const xView = (x / Math.max(1, rect.width)) * width;
    const t = (xView - padL) / Math.max(1, width - padL - padR);
    const rawYear = xMin + t * (xMax - xMin);
    const year = nearestYear(series, Math.round(rawYear));

    if (!Number.isFinite(year)) {
      return;
    }

    setDragStartYear(year);
    notifyHover(year);
  }

  function handleUp() {
    if (!enableBrush) {
      return;
    }
    setDragStartYear(null);
  }

  const windowX1 = xScale(Math.min(effectiveStart, effectiveEnd));
  const windowX2 = xScale(Math.max(effectiveStart, effectiveEnd));

  if (isRightCompact) {
    return (
      <section ref={panelRef} className="dashChartCard dashChartCardCompact">
        <div className="dashChartMainCompact">
          <div className="dashChartMetaCompact">
            <div className="dashChartTitle">{title}</div>
            <div className="small">{subtitle}</div>
            <div className="dashChartStatValue" style={{ color: accent }}>
              {withUnit(formatDelta(rangeDelta, valueFormatter), unitLabel)}
            </div>
            <div className="dashChartStatDelta">
              {countryValueLine(effectiveStart, startValue, valueFormatter, unitLabel, accent)}
              {countryValueLine(effectiveEnd, endValue, valueFormatter, unitLabel, accent)}
            </div>
            {referenceFinite.length ? (
              <div className="dashChartStatAvg" style={{ color: "#6b7280" }}>
                World avg Δ: {withUnit(formatDelta(avgDelta, valueFormatter), unitLabel)}
              </div>
            ) : null}
            {compactFooter ? <div className="dashChartMetaCompactFooter">{compactFooter}</div> : null}
          </div>

          <svg viewBox={`0 0 ${width} ${height}`} className="dashChartSvg dashChartSvgCompact">
            <line x1={padL} y1={height - padB} x2={width - padR} y2={height - padB} className="dashAxis" />
            <line x1={padL} y1={padT} x2={padL} y2={height - padB} className="dashAxis" />

            <line
              x1={padL}
              y1={(padT + height - padB) / 2}
              x2={width - padR}
              y2={(padT + height - padB) / 2}
              className="dashGrid"
            />

            {referencePath ? <path d={referencePath} fill="none" className="dashAvgLine" /> : null}

            <path d={path} fill="none" stroke={accent} strokeWidth="3" />

            {Number.isFinite(effectiveStart) && Number.isFinite(effectiveEnd) ? (
              <rect
                x={windowX1}
                y={padT}
                width={Math.max(1, windowX2 - windowX1)}
                height={height - padT - padB}
                className="dashWindowFill"
              />
            ) : null}

            {Number.isFinite(effectiveStart) ? (
              <line
                x1={xScale(effectiveStart)}
                y1={padT}
                x2={xScale(effectiveStart)}
                y2={height - padB}
                className="dashRangeLine"
              />
            ) : null}

            {Number.isFinite(effectiveEnd) ? (
              <line x1={xScale(effectiveEnd)} y1={padT} x2={xScale(effectiveEnd)} y2={height - padB} className="dashFocusLine" />
            ) : null}

            {point ? <circle cx={xScale(point.year)} cy={yScale(point.value)} r="4.8" fill={accent} /> : null}

            <text x={padL} y={height - 3} className="dashTickText">
              {xMin}
            </text>
            <text x={width - padR} y={height - 3} textAnchor="end" className="dashTickText">
              {xMax}
            </text>
            <text x={padL - 6} y={padT + 4} textAnchor="end" className="dashTickText">
              {valueFormatter ? valueFormatter(yMax) : yMax.toFixed(2)}
            </text>
            <text x={padL - 6} y={height - padB + 4} textAnchor="end" className="dashTickText">
              {valueFormatter ? valueFormatter(yMin) : yMin.toFixed(2)}
            </text>
            <text x={xScale(effectiveStart)} y={height - 18} textAnchor="middle" className="dashRangeText">
              {effectiveStart}
            </text>
            <text x={xScale(effectiveEnd)} y={height - 18} textAnchor="middle" className="dashRangeText">
              {effectiveEnd}
            </text>

            <rect
              x={padL}
              y={padT}
              width={width - padL - padR}
              height={height - padT - padB}
              fill="transparent"
              onMouseDown={handleDown}
              onMouseMove={handleMove}
              onMouseUp={handleUp}
              onMouseLeave={() => {
                notifyHover(null);
                handleUp();
              }}
            />
          </svg>
        </div>
      </section>
    );
  }

  return (
    <section ref={panelRef} className="dashChartCard">
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
            {countryValueLine(effectiveStart, startValue, valueFormatter, unitLabel, accent)}
            {countryValueLine(effectiveEnd, endValue, valueFormatter, unitLabel, accent)}
          </div>
          {referenceFinite.length ? (
            <div className="dashChartStatAvg" style={{ color: "#6b7280" }}>
              World avg Δ: {withUnit(formatDelta(avgDelta, valueFormatter), unitLabel)}
            </div>
          ) : null}
        </div>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="dashChartSvg">
        <line x1={padL} y1={height - padB} x2={width - padR} y2={height - padB} className="dashAxis" />
        <line x1={padL} y1={padT} x2={padL} y2={height - padB} className="dashAxis" />

        <line x1={padL} y1={(padT + height - padB) / 2} x2={width - padR} y2={(padT + height - padB) / 2} className="dashGrid" />

        {referencePath ? <path d={referencePath} fill="none" className="dashAvgLine" /> : null}

        <path d={path} fill="none" stroke={accent} strokeWidth="3" />

        {Number.isFinite(effectiveStart) && Number.isFinite(effectiveEnd) ? (
          <rect
            x={windowX1}
            y={padT}
            width={Math.max(1, windowX2 - windowX1)}
            height={height - padT - padB}
            className="dashWindowFill"
          />
        ) : null}

        {Number.isFinite(effectiveStart) ? (
          <line
            x1={xScale(effectiveStart)}
            y1={padT}
            x2={xScale(effectiveStart)}
            y2={height - padB}
            className="dashRangeLine"
          />
        ) : null}

        {Number.isFinite(effectiveEnd) ? (
          <line x1={xScale(effectiveEnd)} y1={padT} x2={xScale(effectiveEnd)} y2={height - padB} className="dashFocusLine" />
        ) : null}

        {point ? <circle cx={xScale(point.year)} cy={yScale(point.value)} r="4.8" fill={accent} /> : null}

        <text x={padL} y={height - 10} className="dashTickText">
          {xMin}
        </text>
        <text x={width - padR} y={height - 10} textAnchor="end" className="dashTickText">
          {xMax}
        </text>
        <text x={padL - 6} y={padT + 4} textAnchor="end" className="dashTickText">
          {valueFormatter ? valueFormatter(yMax) : yMax.toFixed(2)}
        </text>
        <text x={padL - 6} y={height - padB + 4} textAnchor="end" className="dashTickText">
          {valueFormatter ? valueFormatter(yMin) : yMin.toFixed(2)}
        </text>

        <text x={xScale(effectiveStart)} y={height - 12} textAnchor="middle" className="dashRangeText">
          {effectiveStart}
        </text>
        <text x={xScale(effectiveEnd)} y={height - 12} textAnchor="middle" className="dashRangeText">
          {effectiveEnd}
        </text>

        <rect
          x={padL}
          y={padT}
          width={width - padL - padR}
          height={height - padT - padB}
          fill="transparent"
          onMouseDown={handleDown}
          onMouseMove={handleMove}
          onMouseUp={handleUp}
          onMouseLeave={() => {
            notifyHover(null);
            handleUp();
          }}
        />
      </svg>
    </section>
  );
}
