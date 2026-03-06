import React from "react";

export default function DashboardHeader({
    hasCountry,
    countryName,
    iso3,
    selectedDisease,
    diseases,
    onDiseaseChange,
    burdenMetric,
    onMetricChange,
    rangeWidth,
    minYear,
    maxYear,
    onRangeWidthChange,
}) {
  const maxWidth = Math.max(1, Math.min(64, maxYear - minYear));
  const bubbleLeftPct =
    maxWidth <= 1 ? 0 : ((rangeWidth - 1) / (maxWidth - 1)) * 100;
  return (
    <section className="dashHeaderCard">
      <div>
        <div className="dashTitleRow">
          <div className="dashPageTitle">Country Impact Dashboard</div>
          <div className={hasCountry ? "dashCountryInline" : "dashCountryInline dashCountryInlineWarn"}>
            {hasCountry
              ? `${countryName} (${iso3})`
              : "No country selected. Select a country from 2. Globe view to populate this dashboard."}
          </div>
        </div>
        {hasCountry ? (
          <div className="dashCountryLine">
            This dashboard is scoped to the selected country across all charts.
          </div>
        ) : null}
      </div>

      <div className="dashControls">
        <div className="dashControl">
          <label className="lbl">Disease</label>
          <select
            value={selectedDisease}
            onChange={(e) => onDiseaseChange(e.target.value)}
          >
            {diseases.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        <div className="dashControl">
          <label className="lbl">Burden metric</label>
          <div className="dashMetricSwitch">
            <button
              className={burdenMetric === "number" ? "dashToggle dashToggleOn" : "dashToggle"}
              onClick={() => onMetricChange("number")}
              type="button"
            >
              Number
            </button>
            <button
              className={burdenMetric === "rate" ? "dashToggle dashToggleOn" : "dashToggle"}
              onClick={() => onMetricChange("rate")}
              type="button"
            >
              Rate
            </button>
          </div>
        </div>

        <div className="dashControl dashYearControl">
          <div className="dashRangeControlLabel">Range width (highlighted years)</div>
          <div className="dashRangeSliderWrap">
            <div className="dashRangeValueBubble" style={{ left: `${bubbleLeftPct}%` }}>
              {rangeWidth}
            </div>
            <input
              type="range"
              min={1}
              max={maxWidth}
              step={1}
              value={rangeWidth}
              onChange={(e) => onRangeWidthChange(Number(e.target.value))}
            />
          </div>
          <div className="dashRangeBounds">
            <span>1</span>
            <span>{maxWidth}</span>
          </div>
          <div className="small">Hover chart to move this fixed-width range across all views.</div>
        </div>
      </div>
    </section>
  );
}
