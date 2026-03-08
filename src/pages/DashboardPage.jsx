import React, { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { usePageReady } from "../state/pageReady";
import { useIhmeData, ISO_PROP, NAME_PROP } from "../hooks/useIhmeData";
import { useCountryDemographicsData } from "../hooks/useCountryDemographicsData";
import { diseaseAccent } from "../utils/color";
import TimeSeriesPanel from "../components/dashboard/TimeSeriesPanel";

const YEAR_MIN = 1980;
const YEAR_MAX = 2023;

function safeNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function compact(v) {
  if (!Number.isFinite(v)) return "—";
  if (Math.abs(v) >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
  if (Math.abs(v) >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
  if (Math.abs(v) >= 1e3) return `${(v / 1e3).toFixed(2)}K`;

  return `${Math.round(v)}`;
}

function fmt2(v) {
  if (!Number.isFinite(v)) return "—";

  return v.toFixed(2);
}

function nearestYear(years, target) {
  if (!years.length || !Number.isFinite(target)) return years[0] ?? null;
  let best = years[0];
  let dist = Math.abs(best - target);
  for (const y of years) {
    const d = Math.abs(y - target);
    if (d < dist) {
      best = y;
      dist = d;
    }
  }
  return best;
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function formatMetricValue(v) {
  if (!Number.isFinite(v)) return "—";
  return compact(v);
}

export default function DashboardPage() {
  const { iso3 } = useParams();
  const [sp] = useSearchParams();

  const diseaseFromQuery = (sp.get("disease") || "").trim();
  const yearFromQuery = safeNum(sp.get("year"));
  const iso3Upper = String(iso3 || "").trim().toUpperCase();
  const hasCountry = iso3Upper.length === 3;

  const {
    countriesGeo,
    valuesByMetricDiseaseYear,
    diseases,
    years: ihmeYears,
    loading: ihmeLoading,
    error: ihmeError,
  } = useIhmeData();

  const {
    byIso3,
    years: demoYears,
    loading: demoLoading,
    error: demoError,
  } = useCountryDemographicsData();

  const [selectedDisease, setSelectedDisease] = useState(diseaseFromQuery || "");
  const [rangeWidth, setRangeWidth] = useState(5);
  const [rangeAnchorEnd, setRangeAnchorEnd] = useState(yearFromQuery ?? 2000);
  const [hoverYear, setHoverYear] = useState(null);

  useEffect(() => {
    if (diseaseFromQuery) setSelectedDisease(diseaseFromQuery);
  }, [diseaseFromQuery]);

  useEffect(() => {
    if (!diseases.length) return;
    if (!selectedDisease || !diseases.includes(selectedDisease)) {
      setSelectedDisease(diseases[0]);
    }
  }, [diseases, selectedDisease]);

  const allYears = useMemo(() => {
    const set = new Set([...ihmeYears, ...demoYears]);
    return Array.from(set)
      .filter((y) => y >= YEAR_MIN && y <= YEAR_MAX)
      .sort((a, b) => a - b);
  }, [ihmeYears, demoYears]);

  const filteredDemoYears = useMemo(
    () => demoYears.filter((y) => y >= YEAR_MIN && y <= YEAR_MAX),
    [demoYears]
  );

  useEffect(() => {
    if (!allYears.length) return;
    const minY = allYears[0];
    const maxY = allYears[allYears.length - 1];
    const widthMax = Math.max(1, maxY - minY);
    const nextWidth = clamp(rangeWidth, 1, widthMax);
    setRangeWidth(nextWidth);
    const initialEnd = yearFromQuery ?? 2000;
    const nextEnd = nearestYear(allYears, initialEnd);
    setRangeAnchorEnd(clamp(nextEnd, minY + nextWidth, maxY));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allYears.length]);

  const minYear = allYears[0] ?? YEAR_MIN;
  const maxYear = allYears[allYears.length - 1] ?? YEAR_MAX;
  const effectiveRangeWidth = Math.max(1, Math.min(rangeWidth, Math.max(1, maxYear - minYear)));
  const rangeEnd = useMemo(() => {
    const end = Number.isFinite(hoverYear) ? hoverYear : rangeAnchorEnd;
    return nearestYear(allYears, clamp(end, minYear + effectiveRangeWidth, maxYear));
  }, [allYears, hoverYear, rangeAnchorEnd, minYear, maxYear, effectiveRangeWidth]);
  const rangeStart = useMemo(
    () => nearestYear(allYears, rangeEnd - effectiveRangeWidth),
    [allYears, rangeEnd, effectiveRangeWidth]
  );
  const presetWidths = useMemo(
    () => [3, 5, 10, 20].filter((w) => w <= Math.max(1, maxYear - minYear)),
    [minYear, maxYear]
  );

  const countryName = useMemo(() => {
    const features = countriesGeo?.features || [];
    const f = features.find(
      (x) => String(x?.properties?.[ISO_PROP] || "").trim().toUpperCase() === iso3Upper
    );
    return f?.properties?.[NAME_PROP] || iso3Upper;
  }, [countriesGeo, iso3Upper]);

  const countryDemoRows = hasCountry ? byIso3[iso3Upper] || [] : [];
  const countryIsoSet = useMemo(() => {
    const set = new Set();
    const features = countriesGeo?.features || [];
    for (const f of features) {
      const code = String(f?.properties?.[ISO_PROP] || "").trim().toUpperCase();
      if (code) set.add(code);
    }
    return set;
  }, [countriesGeo]);

  const demoByYear = useMemo(() => {
    const out = Object.create(null);
    for (const r of countryDemoRows) out[r.year] = r;
    return out;
  }, [countryDemoRows]);

  const burdenSeries = useMemo(() => {
    const byDiseaseYear = valuesByMetricDiseaseYear?.number?.[selectedDisease] || {};
    return filteredDemoYears.map((y) => ({
      year: y,
      value: safeNum(byDiseaseYear?.[y]?.[iso3Upper]),
    }));
  }, [valuesByMetricDiseaseYear, selectedDisease, filteredDemoYears, iso3Upper]);

  const burdenWorldAvgSeries = useMemo(() => {
    const byDiseaseYear = valuesByMetricDiseaseYear?.number?.[selectedDisease] || {};
    return filteredDemoYears.map((y) => {
      const bucket = byDiseaseYear?.[y] || {};
      let sum = 0;
      let count = 0;
      for (const isoCode of countryIsoSet) {
        const v = safeNum(bucket?.[isoCode]);
        if (v !== null) {
          sum += v;
          count += 1;
        }
      }
      return {
        year: y,
        value: count > 0 ? sum / count : null,
      };
    });
  }, [valuesByMetricDiseaseYear, selectedDisease, filteredDemoYears, countryIsoSet]);

  const growthSeries = useMemo(
    () =>
      filteredDemoYears.map((y) => ({
        year: y,
        value: safeNum(demoByYear?.[y]?.pop_growth),
      })),
    [filteredDemoYears, demoByYear]
  );

  const lifeSeries = useMemo(
    () =>
      filteredDemoYears.map((y) => ({
        year: y,
        value: safeNum(demoByYear?.[y]?.life_expectancy),
      })),
    [filteredDemoYears, demoByYear]
  );

  const populationSeries = useMemo(
    () =>
      filteredDemoYears.map((y) => ({
        year: y,
        value: safeNum(demoByYear?.[y]?.population),
      })),
    [filteredDemoYears, demoByYear]
  );

  const latestDemoYear = useMemo(
    () => (countryDemoRows.length ? Number(countryDemoRows[countryDemoRows.length - 1]?.year) : null),
    [countryDemoRows]
  );

  const latestDemo = useMemo(
    () => (Number.isFinite(latestDemoYear) ? demoByYear?.[latestDemoYear] || null : null),
    [demoByYear, latestDemoYear]
  );

  const countryInfoCards = useMemo(
    () => [
      {
        label: "National Income",
        value: "Placeholder",
        sub: "replace with income dataset",
      },
      {
        label: "Income Classification",
        value: "Low / High (Placeholder)",
        sub: "e.g. low income / high income",
      },
      {
        label: "Age",
        value: Number.isFinite(safeNum(latestDemo?.life_expectancy))
          ? `${fmt2(safeNum(latestDemo?.life_expectancy))} yrs (proxy)`
          : "Placeholder",
        sub: Number.isFinite(latestDemoYear) ? `latest year: ${latestDemoYear}` : "latest year: —",
      },
    ],
    [latestDemo, latestDemoYear]
  );

  const avgSeriesByMetric = useMemo(() => {
    const buckets = {
      pop_growth: Object.create(null),
      life_expectancy: Object.create(null),
      population: Object.create(null),
    };

    for (const isoCode of countryIsoSet) {
      const rows = byIso3?.[isoCode] || [];
      for (const r of rows) {
        const y = Number(r.year);
        if (!Number.isFinite(y) || y < YEAR_MIN || y > YEAR_MAX) continue;

        const vGrowth = safeNum(r.pop_growth);
        if (vGrowth !== null) {
          buckets.pop_growth[y] ??= { sum: 0, count: 0 };
          buckets.pop_growth[y].sum += vGrowth;
          buckets.pop_growth[y].count += 1;
        }

        const vLife = safeNum(r.life_expectancy);
        if (vLife !== null) {
          buckets.life_expectancy[y] ??= { sum: 0, count: 0 };
          buckets.life_expectancy[y].sum += vLife;
          buckets.life_expectancy[y].count += 1;
        }

        const vPop = safeNum(r.population);
        if (vPop !== null) {
          buckets.population[y] ??= { sum: 0, count: 0 };
          buckets.population[y].sum += vPop;
          buckets.population[y].count += 1;
        }
      }
    }

    const toSeries = (metricKey) =>
      filteredDemoYears.map((y) => {
        const b = buckets[metricKey][y];
        return {
          year: y,
          value: b && b.count > 0 ? b.sum / b.count : null,
        };
      });

    return {
      pop_growth: toSeries("pop_growth"),
      life_expectancy: toSeries("life_expectancy"),
      population: toSeries("population"),
    };
  }, [countryIsoSet, byIso3, filteredDemoYears]);

  const burdenStats = useMemo(() => {
    const finite = burdenSeries.filter((d) => Number.isFinite(d.year) && Number.isFinite(d.value));
    let peak = null;
    for (const row of finite) {
      if (!peak || row.value > peak.value) {
        peak = row;
      }
    }

    const peakYear = peak?.year ?? null;
    const prevYear = Number.isFinite(peakYear) ? peakYear - 1 : null;
    const nextYear = Number.isFinite(peakYear) ? peakYear + 1 : null;
    const prevPoint = Number.isFinite(prevYear) ? finite.find((d) => d.year === prevYear) || null : null;
    const nextPoint = Number.isFinite(nextYear) ? finite.find((d) => d.year === nextYear) || null : null;
    const deltaFromPrev =
      peak && prevPoint && Number.isFinite(peak.value) && Number.isFinite(prevPoint.value)
        ? peak.value - prevPoint.value
        : null;
    const deltaToNext =
      peak && nextPoint && Number.isFinite(peak.value) && Number.isFinite(nextPoint.value)
        ? nextPoint.value - peak.value
        : null;

    return {
      peakYear,
      peakValue: peak?.value ?? null,
      prevYear,
      nextYear,
      deltaFromPrev,
      deltaToNext,
    };
  }, [burdenSeries]);

  const worldAvgRangeDelta = useMemo(() => {
    const start = burdenWorldAvgSeries.find((d) => d.year === rangeStart);
    const end = burdenWorldAvgSeries.find((d) => d.year === rangeEnd);
    if (!start || !end) return null;
    if (!Number.isFinite(start.value) || !Number.isFinite(end.value)) return null;
    return end.value - start.value;
  }, [burdenWorldAvgSeries, rangeStart, rangeEnd]);

  const loading = ihmeLoading || demoLoading;
  const error = [ihmeError, demoError].filter(Boolean).join(" ");
  const accent = diseaseAccent(selectedDisease);
  const rangeWidthMax = Math.max(1, maxYear - minYear);
  const bubbleLeftPct =
    rangeWidthMax <= 1 ? 0 : ((effectiveRangeWidth - 1) / (rangeWidthMax - 1)) * 100;

  const { markReady } = usePageReady();
  useEffect(() => {
    if (!loading) markReady();
  }, [loading, markReady]);

  const applyRangeWindow = (yearA, yearB) => {
    if (!Number.isFinite(yearA) || !Number.isFinite(yearB)) return;
    const start = Math.min(yearA, yearB);
    const end = Math.max(yearA, yearB);
    const nextW = clamp(end - start, 1, rangeWidthMax);
    const nextEnd = clamp(end, minYear + nextW, maxYear);
    setRangeWidth(nextW);
    setRangeAnchorEnd(nextEnd);
    setHoverYear(null);
  };

  return (
    <div className="dashboardWrap">
      <div className="dashboardCanvas dashboardContent">
        {!hasCountry ? (
          <div className="dashLoadingCard dashInlineCardRow">
            <span>Select a country in 2 Globe to open a full dashboard.</span>
            <Link className="btnSmall" to={`/globe?disease=${encodeURIComponent(selectedDisease)}`}>
              Go to 2 Globe
            </Link>
          </div>
        ) : null}

        {error ? <div className="dashErrorCard">{error}</div> : null}

        {loading ? <div className="dashLoadingCard">Loading dashboard data…</div> : null}

        {hasCountry && !loading ? (
          <div className="dashSplitLayout">
            <section className="dashLeftColumn">
              <section className="dashCountryHero">
                <div className="dashCountryHeroTitle">{countryName}</div>
                <div className="dashCountryInfoTitle">Country Info (Placeholder)</div>
                <div className="dashCountryInfoGrid">
                  {countryInfoCards.map((item) => (
                    <article key={item.label} className="dashCountryInfoItem">
                      <div className="dashCountryInfoLabel">{item.label}</div>
                      <div className="dashCountryInfoValue">{item.value}</div>
                      <div className="dashCountryInfoSub">{item.sub}</div>
                    </article>
                  ))}
                </div>
              </section>

              <section className="dashBurdenCard">
                <div className="dashBurdenTitle">Disease burden — {selectedDisease}</div>
                <div className="dashBurdenSummaryLine">
                  <span>
                    Peak {Number.isFinite(burdenStats.peakYear) ? burdenStats.peakYear : "—"}:{" "}
                    <strong style={{ color: accent }}>
                      {formatMetricValue(burdenStats.peakValue)}
                    </strong>
                  </span>
                  <span>
                    Δ prev:{" "}
                    <strong style={{ color: accent }}>
                      {Number.isFinite(burdenStats.deltaFromPrev)
                        ? `${burdenStats.deltaFromPrev > 0 ? "+" : ""}${formatMetricValue(
                            burdenStats.deltaFromPrev
                          )}`
                        : "—"}
                    </strong>
                  </span>
                  <span>
                    Δ next:{" "}
                    <strong style={{ color: accent }}>
                      {Number.isFinite(burdenStats.deltaToNext)
                        ? `${burdenStats.deltaToNext > 0 ? "+" : ""}${formatMetricValue(
                            burdenStats.deltaToNext
                          )}`
                        : "—"}
                    </strong>
                  </span>
                  <span style={{ color: "#6b7280" }}>
                    World avg Δ window:{" "}
                    <strong style={{ color: "#6b7280" }}>
                      {Number.isFinite(worldAvgRangeDelta)
                        ? `${worldAvgRangeDelta > 0 ? "+" : ""}${formatMetricValue(worldAvgRangeDelta)}`
                        : "—"}
                    </strong>
                  </span>
                </div>

                <div className="dashBurdenMainChart">
                  <TimeSeriesPanel
                    title="Disease burden (Number)"
                    subtitle={`${selectedDisease} in ${countryName}`}
                    series={burdenSeries}
                    referenceSeries={burdenWorldAvgSeries}
                    rangeStart={rangeStart}
                    rangeEnd={rangeEnd}
                    hoverYear={hoverYear}
                    onHoverYear={setHoverYear}
                    accent={accent}
                    valueFormatter={compact}
                    unitLabel="deaths"
                    layout="rightCompact"
                    enableBrush
                    onBrushRangeChange={applyRangeWindow}
                  />
                </div>

                <section className="dashControlsCard dashControlsInBurden">
                  <div className="dashControlsTitle">Range width</div>
                  <div className="dashRangeBrushHint">Drag on Disease burden chart to set window</div>

                  <div className="dashRangePresetRow">
                    {presetWidths.map((w) => (
                      <button
                        key={w}
                        type="button"
                        className={effectiveRangeWidth === w ? "dashToggle dashToggleOn" : "dashToggle"}
                        onClick={() => {
                          const nextW = clamp(w, 1, rangeWidthMax);
                          setRangeWidth(nextW);
                          setRangeAnchorEnd((prev) => clamp(prev, minYear + nextW, maxYear));
                          setHoverYear(null);
                        }}
                      >
                        {w}y
                      </button>
                    ))}
                    <button
                      type="button"
                      className={
                        effectiveRangeWidth === rangeWidthMax ? "dashToggle dashToggleOn" : "dashToggle"
                      }
                      onClick={() => {
                        setRangeWidth(rangeWidthMax);
                        setRangeAnchorEnd(maxYear);
                        setHoverYear(null);
                      }}
                    >
                      Full
                    </button>
                  </div>

                  <div className="dashControl dashYearPanel">
                    <div className="dashRangeControlLabel">Range width (years)</div>
                    <div className="dashRangeSliderWrap">
                      <div className="dashRangeValueBubble" style={{ left: `${bubbleLeftPct}%` }}>
                        {effectiveRangeWidth}
                      </div>
                      <input
                        type="range"
                        min={1}
                        max={rangeWidthMax}
                        step={1}
                        value={effectiveRangeWidth}
                        className="dashRangeSlider"
                        style={{
                          background: `linear-gradient(90deg, rgba(37,99,235,0.88) 0%, rgba(37,99,235,0.88) ${bubbleLeftPct}%, rgba(148,163,184,0.30) ${bubbleLeftPct}%, rgba(148,163,184,0.30) 100%)`,
                        }}
                        onChange={(e) => {
                          const nextW = clamp(Number(e.target.value), 1, rangeWidthMax);
                          setRangeWidth(nextW);
                          setRangeAnchorEnd((prev) => clamp(prev, minYear + nextW, maxYear));
                          setHoverYear(null);
                        }}
                      />
                    </div>
                    <div className="dashRangeBounds">
                      <span>1</span>
                      <span>{rangeWidthMax}</span>
                    </div>
                  </div>
                </section>
              </section>
            </section>

            <section className="dashRightColumn">
              <TimeSeriesPanel
                title="Population Growth Rate (%)"
                subtitle="Annual growth rate over time"
                series={growthSeries}
                referenceSeries={avgSeriesByMetric.pop_growth}
                contextCountry={hasCountry ? `${countryName} (${iso3Upper})` : "Not selected"}
                contextDisease={selectedDisease}
                rangeStart={rangeStart}
                rangeEnd={rangeEnd}
                hoverYear={hoverYear}
                onHoverYear={setHoverYear}
                accent="#0f766e"
                valueFormatter={fmt2}
                unitLabel="pp"
                layout="rightCompact"
              />

              <TimeSeriesPanel
                title="Life Expectancy (Years)"
                subtitle="Before / during / after outbreak patterns"
                series={lifeSeries}
                referenceSeries={avgSeriesByMetric.life_expectancy}
                contextCountry={hasCountry ? `${countryName} (${iso3Upper})` : "Not selected"}
                contextDisease={selectedDisease}
                rangeStart={rangeStart}
                rangeEnd={rangeEnd}
                hoverYear={hoverYear}
                onHoverYear={setHoverYear}
                accent="#7c3aed"
                valueFormatter={fmt2}
                unitLabel="years"
                layout="rightCompact"
              />

              <TimeSeriesPanel
                title="Population"
                subtitle="Country population trajectory"
                series={populationSeries}
                referenceSeries={avgSeriesByMetric.population}
                contextCountry={hasCountry ? `${countryName} (${iso3Upper})` : "Not selected"}
                contextDisease={selectedDisease}
                rangeStart={rangeStart}
                rangeEnd={rangeEnd}
                hoverYear={hoverYear}
                onHoverYear={setHoverYear}
                accent="#b45309"
                valueFormatter={compact}
                unitLabel="people"
                layout="rightCompact"
              />
            </section>
          </div>
        ) : null}
      </div>
    </div>
  );
}
