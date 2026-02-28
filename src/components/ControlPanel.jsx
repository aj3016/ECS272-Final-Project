import React from "react";

function Legend({ thresholds }) {
  const colors = ["#f3f4f6", "#dbeafe", "#93c5fd", "#60a5fa", "#2563eb"];
  const labels = thresholds
    ? [
        "0 (no burden)",
        `< ${thresholds[0].toFixed(2)}`,
        `${thresholds[0].toFixed(2)} – ${thresholds[1].toFixed(2)}`,
        `${thresholds[1].toFixed(2)} – ${thresholds[2].toFixed(2)}`,
        `≥ ${thresholds[2].toFixed(2)}`,
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
  // diseases,
  years,
  selectedDisease,
  selectedYear,
  // onDiseaseChange,
  onYearChange,
  playing,
  onTogglePlay,
  speedMs,
  onSpeedChange,
  spinEnabled,
  onSpinToggle,
  thresholds,
}) {
  const minY = years?.[0] ?? 1970;
  const maxY = years?.[years.length - 1] ?? 2024;

  return (
    <div className="panel">
      <div style={{ fontWeight: 700 }}>Global Disease Globe</div>
      <div className="small">
        Rotate, scrub time, click a country to zoom + see drill-down.
      </div>

      {/* <div className="row">
        <label>Disease</label>
        <select
          value={selectedDisease || ""}
          onChange={(e) => onDiseaseChange(e.target.value)}
        >
          {diseases.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div> */
      <div className="row">
        <label>Disease</label>
        <div style={{ fontWeight: 600 }}>
          {selectedDisease}
        </div>
      </div>
      }

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
        <label>Speed</label>
        <select value={String(speedMs)} onChange={(e) => onSpeedChange(Number(e.target.value))}>
          <option value="1200">Slow</option>
          <option value="700">Normal</option>
          <option value="350">Fast</option>
        </select>
      </div>

      <div className="row">
        <label>Auto-spin</label>
        <input
          type="checkbox"
          checked={spinEnabled}
          onChange={(e) => onSpinToggle(e.target.checked)}
        />
      </div>

      <Legend thresholds={thresholds} />
    </div>
  );
}
