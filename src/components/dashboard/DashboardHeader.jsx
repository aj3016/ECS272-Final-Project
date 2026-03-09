import React from "react";

export default function DashboardHeader({
    hasCountry,
    countryName,
    iso3,
    selectedDisease,
    rangeStart,
    rangeEnd,
    rangeWidth,
    minYear,
    maxYear,
    onRangeWidthChange,
}) {
  const maxWidth = Math.max(1, maxYear - minYear);
  const bubbleLeftPct =
    maxWidth <= 1 ? 0 : ((rangeWidth - 1) / (maxWidth - 1)) * 100;
  return (
    <section className="dashHeaderCard">
      <div>
        <div className="dashTitleRow">
          <div className="dashPageTitle">
            {hasCountry ? countryName : "Please select country in View 2: Globe"}
          </div>
        </div>
      </div>

      <div className="dashControls">
        <div className="dashControl dashYearPanel">
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
          <div className="dashRangeWindowText">
            window: {rangeStart} - {rangeEnd}
          </div>
          <div className="dashRangeBounds">
            <span>1</span>
            <span>{maxWidth}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
