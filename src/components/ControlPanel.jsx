import React from "react";
import { getPalette } from "../utils/palettes";

function formatLegendNumber(x, metric) {
  if (!Number.isFinite(x)) return "";
  if (metric === "number") {
    if (x >= 1e9) return `${(x / 1e9).toFixed(2)}B`;
    if (x >= 1e6) return `${(x / 1e6).toFixed(2)}M`;
    if (x >= 1e3) return `${(x / 1e3).toFixed(2)}K`;
    return `${Math.round(x)}`;
  }
  return x.toFixed(2);
}

function Legend({ thresholds, metric, paletteName }) {
  const colors = getPalette(paletteName);

  const labels = thresholds
    ? [
        "0 (no burden)",
        `< ${formatLegendNumber(thresholds[0], metric)}`,
        `${formatLegendNumber(thresholds[0], metric)} – ${formatLegendNumber(
          thresholds[1],
          metric
        )}`,
        `${formatLegendNumber(thresholds[1], metric)} – ${formatLegendNumber(
          thresholds[2],
          metric
        )}`,
        `≥ ${formatLegendNumber(thresholds[2], metric)}`,
      ]
    : ["0 (no burden)", "low", "mid", "high", "very high"];

  return (
    <>
      <div className="legend">
        {colors.map((c, i) => (
          <div key={i} className="swatch" style={{ background: c }} />
        ))}
        <div className="legendLabel">{labels.join("  |  ")}</div>
      </div>
      <div className="small">
        Gray = missing data. Very light gray = zero burden. Blue scale =
        increasing burden.
      </div>
    </>
  );
}

export default function ControlPanel({
  years,
  selectedDisease,
  selectedYear,
  onYearChange,
  playing,
  onTogglePlay,
  speedMs,
  onSpeedChange,
  spinEnabled,
  onSpinToggle,
  thresholds,
  metric,
  onMetricChange,
  scaleMode,
  onScaleModeChange,
  paletteName,
  onPaletteChange,
}) {
  const minY = years?.[0] ?? 1970;
  const maxY = years?.[years.length - 1] ?? 2024;

  return (
    <div className="panel">
      <div style={{ fontWeight: 700 }}>Global Disease Globe</div>
      <div className="small">
        Rotate, scrub time, click a country to zoom + see drill-down.
      </div>
      <div className="row">
        <label>Disease</label>
        <div
          style={{
            width: "100%",
            padding: "8px 10px",
            borderRadius: "10px",
            border: "1px solid rgba(0,0,0,0.08)",
            background: "rgba(255,255,255,0.78)",
            fontSize: "13px",
            color: "#111",
          }}
        >
          {selectedDisease || "No disease selected"}
        </div>
      </div>

      <div className="row">
        <label>Metric</label>
        <select value={metric} onChange={(e) => onMetricChange(e.target.value)}>
          <option value="rate">Rate</option>
          <option value="number">Number</option>
        </select>
      </div>

      {scaleMode && onScaleModeChange ? (
        <div className="row">
          <label>Scale</label>
          <select
            value={scaleMode}
            onChange={(e) => onScaleModeChange(e.target.value)}
          >
            <option value="global">Global (static)</option>
            <option value="year">Per-year (dynamic)</option>
          </select>
        </div>
      ) : null}

      <div className="row">
        <label>Year</label>
        <input
          type="range"
          min={minY}
          max={maxY}
          step="1"
          value={selectedYear}
          onChange={(e) => onYearChange(Number(e.target.value))}
        />
      </div>

      <div className="small">
        Selected year: <span>{selectedYear}</span>
      </div>

      <div className="row">
        <label>Play</label>
        <button onClick={onTogglePlay}>{playing ? "⏸ Pause" : "▶ Play"}</button>
      </div>

      <div className="row">
        <label>Auto-spin</label>
        <input
          type="checkbox"
          checked={spinEnabled}
          onChange={(e) => onSpinToggle(e.target.checked)}
        />
      </div>

      <Legend thresholds={thresholds} metric={metric} paletteName={paletteName} />
    </div>
  );
}