import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { scaleLinear } from "d3-scale";
import { usePageReady } from "../state/pageReady";
import { useIhmeData, ISO_PROP, NAME_PROP } from "../hooks/useIhmeData";
import { useCountryDemographicsData } from "../hooks/useCountryDemographicsData";
import { diseaseAccent } from "../utils/color";
import TimeSeriesPanel from "../components/dashboard/TimeSeriesPanel";
import AgeStructureDonut from "../components/dashboard/AgeStructureDonut";
import IncomeBarChart from "../components/dashboard/IncomeBarChart";

const YEAR_MIN = 1980;
const YEAR_MAX = 2023;
const INCOME_YEAR_MIN = 1987;

function safeNum(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return null;
  }
  return n;
}

function compact(value) {
  if (!Number.isFinite(value)) {
    return "—";
  }
  if (Math.abs(value) >= 1e9) {
    return `${(value / 1e9).toFixed(2)}B`;
  }
  if (Math.abs(value) >= 1e6) {
    return `${(value / 1e6).toFixed(2)}M`;
  }
  if (Math.abs(value) >= 1e3) {
    return `${(value / 1e3).toFixed(2)}K`;
  }
  return `${Math.round(value)}`;
}

function fmt2(value) {
  if (!Number.isFinite(value)) {
    return "—";
  }
  return value.toFixed(2);
}

function nearestYear(years, target) {
  if (!years.length || !Number.isFinite(target)) {
    if (!years.length) {
      return null;
    }
    return years[0];
  }

  let best = years[0];
  let bestDist = Math.abs(best - target);

  for (let i = 1; i < years.length; i += 1) {
    const year = years[i];
    const dist = Math.abs(year - target);
    if (dist < bestDist) {
      best = year;
      bestDist = dist;
    }
  }

  return best;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function formatMetricValue(value) {
  if (!Number.isFinite(value)) {
    return "—";
  }
  return compact(value);
}

function classifyIncomeGroup(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw || raw === "no data found") {
    return "Unclassified";
  }
  if (raw.includes("high")) {
    return "High";
  }
  if (raw.includes("upper-middle")) {
    return "Upper-middle";
  }
  if (raw.includes("lower-middle")) {
    return "Lower-middle";
  }
  if (raw.includes("low")) {
    return "Low";
  }
  return "Other";
}

function getCountryFeatures(countriesGeo) {
  if (!countriesGeo || !Array.isArray(countriesGeo.features)) {
    return [];
  }
  return countriesGeo.features;
}

function readMetricDiseaseYear(valuesByMetricDiseaseYear, disease) {
  if (!valuesByMetricDiseaseYear) {
    return {};
  }
  const numberMetric = valuesByMetricDiseaseYear.number;
  if (!numberMetric) {
    return {};
  }
  const diseaseMap = numberMetric[disease];
  if (!diseaseMap) {
    return {};
  }
  return diseaseMap;
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
    incomeGroupByYear,
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
  const initialAnchorYear = Number.isFinite(yearFromQuery) ? yearFromQuery : 2000;
  const [selectedIncomeYear, setSelectedIncomeYear] = useState(initialAnchorYear);
  const rightCardMeasureRef = useRef(null);
  const [rightCardHeight, setRightCardHeight] = useState(null);
  const sliderDraggingRef = useRef(false);
  const customSliderRef = useRef(null);
  const [hoverYear, setHoverYear] = useState(null);

  useEffect(() => {
    if (diseaseFromQuery) {
      setSelectedDisease(diseaseFromQuery);
    }
  }, [diseaseFromQuery]);

  useEffect(() => {
    if (!diseases.length) {
      return;
    }
    if (!selectedDisease || !diseases.includes(selectedDisease)) {
      setSelectedDisease(diseases[0]);
    }
  }, [diseases, selectedDisease]);

  const allYears = useMemo(() => {
    const set = new Set([...ihmeYears, ...demoYears]);
    return Array.from(set)
      .filter((year) => year >= YEAR_MIN && year <= YEAR_MAX)
      .sort((a, b) => a - b);
  }, [ihmeYears, demoYears]);

  const filteredDemoYears = useMemo(() => {
    return demoYears.filter((year) => year >= YEAR_MIN && year <= YEAR_MAX);
  }, [demoYears]);

  useEffect(() => {
    if (!allYears.length) {
      return;
    }

    const minY = allYears[0];
    const maxY = allYears[allYears.length - 1];
    const widthMax = Math.max(1, maxY - minY);
    setRangeWidth((prev) => clamp(prev, 1, widthMax));
    setSelectedIncomeYear((prev) => {
      let seed = 2000;
      if (Number.isFinite(prev)) {
        seed = prev;
      } else if (Number.isFinite(yearFromQuery)) {
        seed = yearFromQuery;
      }
      return nearestYear(allYears, seed);
    });
  }, [allYears, yearFromQuery]);

  let minYear = YEAR_MIN;
  let maxYear = YEAR_MAX;
  if (allYears.length) {
    minYear = allYears[0];
    maxYear = allYears[allYears.length - 1];
  }

  const effectiveRangeWidth = Math.max(1, Math.min(rangeWidth, Math.max(1, maxYear - minYear)));
  const incomeAnchorYear = useMemo(() => {
    return nearestYear(allYears, selectedIncomeYear);
  }, [allYears, selectedIncomeYear]);

  const rangeStart = useMemo(() => {
    const maxStart = Math.max(minYear, maxYear - effectiveRangeWidth);
    const startCandidate = clamp(incomeAnchorYear, minYear, maxStart);
    return nearestYear(allYears, startCandidate);
  }, [allYears, incomeAnchorYear, minYear, maxYear, effectiveRangeWidth]);

  const rangeEnd = useMemo(() => {
    return nearestYear(allYears, rangeStart + effectiveRangeWidth);
  }, [allYears, rangeStart, effectiveRangeWidth]);


  const sliderStopWidths = useMemo(() => {
    const widthLimit = Math.max(1, maxYear - minYear);
    const stops = [1, 3, 5, 10, 20, 30, 43].filter((width) => width <= widthLimit);
    if (widthLimit > 1 && !stops.includes(widthLimit)) {
      stops.push(widthLimit);
    }
    return stops;
  }, [minYear, maxYear]);

  const countryName = useMemo(() => {
    const features = getCountryFeatures(countriesGeo);

    for (const feature of features) {
      if (!feature || !feature.properties) {
        continue;
      }
      const isoCode = String(feature.properties[ISO_PROP] || "").trim().toUpperCase();
      if (isoCode === iso3Upper) {
        const name = feature.properties[NAME_PROP];
        return name || iso3Upper;
      }
    }

    return iso3Upper;
  }, [countriesGeo, iso3Upper]);

  const countryDemoRows = useMemo(() => {
    if (hasCountry && byIso3 && Array.isArray(byIso3[iso3Upper])) {
      return byIso3[iso3Upper];
    }
    return [];
  }, [hasCountry, byIso3, iso3Upper]);

  const countryIsoSet = useMemo(() => {
    const set = new Set();
    const features = getCountryFeatures(countriesGeo);

    for (const feature of features) {
      if (!feature || !feature.properties) {
        continue;
      }
      const code = String(feature.properties[ISO_PROP] || "").trim().toUpperCase();
      if (code) {
        set.add(code);
      }
    }

    return set;
  }, [countriesGeo]);

  const demoByYear = useMemo(() => {
    const out = Object.create(null);
    for (const row of countryDemoRows) {
      out[row.year] = row;
    }
    return out;
  }, [countryDemoRows]);

  const burdenSeries = useMemo(() => {
    const byDiseaseYear = readMetricDiseaseYear(valuesByMetricDiseaseYear, selectedDisease);

    return filteredDemoYears.map((year) => {
      const bucket = byDiseaseYear[year];
      let value = null;
      if (bucket) {
        value = safeNum(bucket[iso3Upper]);
      }
      return { year, value };
    });
  }, [valuesByMetricDiseaseYear, selectedDisease, filteredDemoYears, iso3Upper]);

  const burdenWorldAvgSeries = useMemo(() => {
    const byDiseaseYear = readMetricDiseaseYear(valuesByMetricDiseaseYear, selectedDisease);

    return filteredDemoYears.map((year) => {
      const bucket = byDiseaseYear[year] || {};
      let sum = 0;
      let count = 0;

      for (const isoCode of countryIsoSet) {
        const value = safeNum(bucket[isoCode]);
        if (value !== null) {
          sum += value;
          count += 1;
        }
      }

      if (count === 0) {
        return { year, value: null };
      }

      return { year, value: sum / count };
    });
  }, [valuesByMetricDiseaseYear, selectedDisease, filteredDemoYears, countryIsoSet]);

  const growthSeries = useMemo(() => {
    return filteredDemoYears.map((year) => {
      const row = demoByYear[year];
      const value = row ? safeNum(row.pop_growth) : null;
      return { year, value };
    });
  }, [filteredDemoYears, demoByYear]);

  const lifeSeries = useMemo(() => {
    return filteredDemoYears.map((year) => {
      const row = demoByYear[year];
      const value = row ? safeNum(row.life_expectancy) : null;
      return { year, value };
    });
  }, [filteredDemoYears, demoByYear]);

  const populationSeries = useMemo(() => {
    return filteredDemoYears.map((year) => {
      const row = demoByYear[year];
      const value = row ? safeNum(row.population) : null;
      return { year, value };
    });
  }, [filteredDemoYears, demoByYear]);

  const latestDemoYear = useMemo(() => {
    if (!countryDemoRows.length) {
      return null;
    }
    const lastRow = countryDemoRows[countryDemoRows.length - 1];
    return Number(lastRow.year);
  }, [countryDemoRows]);

  const latestDemo = useMemo(() => {
    if (!Number.isFinite(latestDemoYear)) {
      return null;
    }
    return demoByYear[latestDemoYear] || null;
  }, [demoByYear, latestDemoYear]);

  const selectedAgeStructure = useMemo(() => {
    const activeYear = Number.isFinite(hoverYear) ? hoverYear : selectedIncomeYear;
    let best = null;

    for (const row of countryDemoRows) {
      const year = Number(row.year);
      if (!Number.isFinite(year)) continue;

      const age0to14 = safeNum(row.age_0_14_pct);
      const age15to64 = safeNum(row.age_15_64_pct);
      const age65plus = safeNum(row.age_65_plus_pct);
      if (age0to14 === null || age15to64 === null || age65plus === null) continue;

      const distance = Math.abs(year - activeYear);
      if (!best || distance < best.distance || (distance === best.distance && year > best.year)) {
        best = {
          year,
          age0to14,
          age15to64,
          age65plus,
          population: safeNum(row.population),
          distance,
        };
      }
    }

    return (
      best || {
        year: null,
        age0to14: null,
        age15to64: null,
        age65plus: null,
        population: safeNum(latestDemo?.population),
      }
    );
  }, [countryDemoRows, latestDemo, selectedIncomeYear, hoverYear]);

  const incomeBarSeries = useMemo(() => {
    const rows = [];
    for (const row of countryDemoRows) {
      const year = Number(row.year);
      if (!Number.isFinite(year) || year < INCOME_YEAR_MIN || year > YEAR_MAX) continue;
      const value = safeNum(row.gni_per_capita);
      if (value === null) continue;
      const incomeGroup =
        (incomeGroupByYear && incomeGroupByYear[year] && incomeGroupByYear[year][iso3Upper]) ||
        "No data found";
      rows.push({
        year,
        value,
        incomeGroup,
        classification: classifyIncomeGroup(incomeGroup),
      });
    }
    rows.sort((a, b) => a.year - b.year);
    return rows;
  }, [countryDemoRows, incomeGroupByYear, iso3Upper]);

  const avgSeriesByMetric = useMemo(() => {
    const buckets = {
      pop_growth: Object.create(null),
      life_expectancy: Object.create(null),
      population: Object.create(null),
    };

    for (const isoCode of countryIsoSet) {
      const rows = byIso3 && Array.isArray(byIso3[isoCode]) ? byIso3[isoCode] : [];

      for (const row of rows) {
        const year = Number(row.year);
        if (!Number.isFinite(year) || year < YEAR_MIN || year > YEAR_MAX) {
          continue;
        }

        const growthValue = safeNum(row.pop_growth);
        if (growthValue !== null) {
          if (!buckets.pop_growth[year]) {
            buckets.pop_growth[year] = { sum: 0, count: 0 };
          }
          buckets.pop_growth[year].sum += growthValue;
          buckets.pop_growth[year].count += 1;
        }

        const lifeValue = safeNum(row.life_expectancy);
        if (lifeValue !== null) {
          if (!buckets.life_expectancy[year]) {
            buckets.life_expectancy[year] = { sum: 0, count: 0 };
          }
          buckets.life_expectancy[year].sum += lifeValue;
          buckets.life_expectancy[year].count += 1;
        }

        const populationValue = safeNum(row.population);
        if (populationValue !== null) {
          if (!buckets.population[year]) {
            buckets.population[year] = { sum: 0, count: 0 };
          }
          buckets.population[year].sum += populationValue;
          buckets.population[year].count += 1;
        }
      }
    }

    function toSeries(metricKey) {
      return filteredDemoYears.map((year) => {
        const bucket = buckets[metricKey][year];
        if (!bucket || bucket.count === 0) {
          return { year, value: null };
        }
        return { year, value: bucket.sum / bucket.count };
      });
    }

    return {
      pop_growth: toSeries("pop_growth"),
      life_expectancy: toSeries("life_expectancy"),
      population: toSeries("population"),
    };
  }, [countryIsoSet, byIso3, filteredDemoYears]);

  const burdenStats = useMemo(() => {
    const finite = burdenSeries.filter((row) => Number.isFinite(row.year) && Number.isFinite(row.value));

    let peak = null;
    for (const row of finite) {
      if (!peak || row.value > peak.value) {
        peak = row;
      }
    }

    let peakYear = null;
    let peakValue = null;
    let prevYear = null;
    let nextYear = null;
    let deltaFromPrev = null;
    let deltaToNext = null;

    if (peak) {
      peakYear = peak.year;
      peakValue = peak.value;
      prevYear = peakYear - 1;
      nextYear = peakYear + 1;

      const prevPoint = finite.find((row) => row.year === prevYear) || null;
      const nextPoint = finite.find((row) => row.year === nextYear) || null;

      if (prevPoint && Number.isFinite(prevPoint.value)) {
        deltaFromPrev = peak.value - prevPoint.value;
      }
      if (nextPoint && Number.isFinite(nextPoint.value)) {
        deltaToNext = nextPoint.value - peak.value;
      }
    }

    return {
      peakYear,
      peakValue,
      prevYear,
      nextYear,
      deltaFromPrev,
      deltaToNext,
    };
  }, [burdenSeries]);

  const loading = ihmeLoading || demoLoading;
  const error = [ihmeError, demoError].filter(Boolean).join(" ");
  const accent = diseaseAccent(selectedDisease);
  const rangeWidthMax = Math.max(1, maxYear - minYear);
  const widthToPercentScale = useMemo(() => {
    return scaleLinear().domain([1, rangeWidthMax]).range([0, 100]).clamp(true);
  }, [rangeWidthMax]);
  const bubbleLeftPct = widthToPercentScale(effectiveRangeWidth);
  let activeIncomeYear = selectedIncomeYear;
  if (Number.isFinite(hoverYear)) {
    activeIncomeYear = hoverYear;
  }

  const { markReady } = usePageReady();
  useEffect(() => {
    if (!loading) {
      markReady();
    }
  }, [loading, markReady]);

  useEffect(() => {
    const node = rightCardMeasureRef.current;
    if (!node) {
      return undefined;
    }

    const readHeight = () => {
      const next = Math.round(node.getBoundingClientRect().height);
      if (next > 0) {
        setRightCardHeight(next);
      }
    };

    readHeight();

    const observer = new ResizeObserver(readHeight);
    observer.observe(node);

    return () => observer.disconnect();
  }, [hasCountry, loading]);

  function applyRangeWindow(yearA, yearB) {
    if (!Number.isFinite(yearA) && !Number.isFinite(yearB)) {
      return;
    }

    let pointerYear = yearA;
    if (Number.isFinite(yearB)) {
      pointerYear = yearB;
    }
    const maxStart = Math.max(minYear, maxYear - effectiveRangeWidth);
    const nextStart = clamp(pointerYear, minYear, maxStart);
    setSelectedIncomeYear(nextStart);
    setHoverYear(null);
  }

  const updateRangeWidthFromClientX = useCallback(
    (clientX) => {
      const sliderNode = customSliderRef.current;
      if (!sliderNode) {
        return;
      }
      const rect = sliderNode.getBoundingClientRect();
      if (rect.width <= 0) {
        return;
      }
      const pxToWidthScale = scaleLinear().domain([rect.left, rect.right]).range([1, rangeWidthMax]).clamp(true);
      const nextWidth = clamp(Math.round(pxToWidthScale(clientX)), 1, rangeWidthMax);
      setRangeWidth(nextWidth);
      setHoverYear(null);
    },
    [rangeWidthMax]
  );

  const handleSliderKeyDown = useCallback(
    (event) => {
      let nextWidth = effectiveRangeWidth;
      if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
        nextWidth = effectiveRangeWidth - 1;
      } else if (event.key === "ArrowRight" || event.key === "ArrowUp") {
        nextWidth = effectiveRangeWidth + 1;
      } else if (event.key === "PageDown") {
        nextWidth = effectiveRangeWidth - 5;
      } else if (event.key === "PageUp") {
        nextWidth = effectiveRangeWidth + 5;
      } else if (event.key === "Home") {
        nextWidth = 1;
      } else if (event.key === "End") {
        nextWidth = rangeWidthMax;
      } else {
        return;
      }

      event.preventDefault();
      nextWidth = clamp(nextWidth, 1, rangeWidthMax);
      setRangeWidth(nextWidth);
      setHoverYear(null);
    },
    [effectiveRangeWidth, rangeWidthMax]
  );

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
                {/* <div className="dashCountryInfoTitle">Country Info</div> */}
                <div className="dashCountryInfoLayout">
                  <div className="dashCountryInfoGrid dashCountryInfoGridLeft">
                    <IncomeBarChart
                      series={incomeBarSeries}
                      selectedYear={activeIncomeYear}
                      onSelectYear={setSelectedIncomeYear}
                    />
                  </div>

                  <div className="dashCountryInfoAgePane">
                    <AgeStructureDonut
                      year={selectedAgeStructure.year}
                      population={selectedAgeStructure.population}
                      age0to14={selectedAgeStructure.age0to14}
                      age15to64={selectedAgeStructure.age15to64}
                      age65plus={selectedAgeStructure.age65plus}
                    />
                  </div>
                </div>
              </section>

              <section className="dashBurdenCard">
                <div className="dashBurdenMainChart" style={rightCardHeight ? { height: `${rightCardHeight}px` } : undefined}>
                  <TimeSeriesPanel
                    title={`${selectedDisease} in ${countryName}`}
                    // subtitle={`${selectedDisease} in ${countryName}`}
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
                    compactFooter={
                      <div className="dashChartStatDelta dashChartStatDeltaCompactExtra">
                        <div>
                          Peak {Number.isFinite(burdenStats.peakYear) ? burdenStats.peakYear : "—"}:{" "}
                          <span style={{ color: accent, fontWeight: 700 }}>{formatMetricValue(burdenStats.peakValue)}</span>
                        </div>
                        <div>
                          Δ prev:{" "}
                          <span style={{ color: accent, fontWeight: 700 }}>
                            {Number.isFinite(burdenStats.deltaFromPrev)
                              ? `${burdenStats.deltaFromPrev > 0 ? "+" : ""}${formatMetricValue(burdenStats.deltaFromPrev)}`
                              : "—"}
                          </span>
                        </div>
                        <div>
                          Δ next:{" "}
                          <span style={{ color: accent, fontWeight: 700 }}>
                            {Number.isFinite(burdenStats.deltaToNext)
                              ? `${burdenStats.deltaToNext > 0 ? "+" : ""}${formatMetricValue(burdenStats.deltaToNext)}`
                              : "—"}
                          </span>
                        </div>
                      </div>
                    }
                  />
                </div>

                <section className="dashControlsCard dashControlsInBurden">
                  <div className="dashControlsTitle">Range width</div>
                  <div className="dashRangeBrushHint">Drag on Disease burden chart to set window</div>

                  <div className="dashRangeInlineControl">
                    <div className="dashRangeSliderUnified">
                      <div className="dashRangeSliderInline">
                        <div className="dashRangeSliderWrap">
                          <div className="dashRangeValueBubble" style={{ left: `${bubbleLeftPct}%` }}>
                            {effectiveRangeWidth}
                          </div>
                          <div
                            ref={customSliderRef}
                            className="dashCustomSlider"
                            role="slider"
                            tabIndex={0}
                            aria-label="Range width"
                            aria-valuemin={1}
                            aria-valuemax={rangeWidthMax}
                            aria-valuenow={effectiveRangeWidth}
                            onKeyDown={handleSliderKeyDown}
                            onPointerDown={(event) => {
                              event.preventDefault();
                              sliderDraggingRef.current = true;
                              event.currentTarget.setPointerCapture(event.pointerId);
                              updateRangeWidthFromClientX(event.clientX);
                            }}
                            onPointerMove={(event) => {
                              if (!sliderDraggingRef.current) {
                                return;
                              }
                              updateRangeWidthFromClientX(event.clientX);
                            }}
                            onPointerUp={(event) => {
                              sliderDraggingRef.current = false;
                              if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                                event.currentTarget.releasePointerCapture(event.pointerId);
                              }
                            }}
                            onPointerCancel={(event) => {
                              sliderDraggingRef.current = false;
                              if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                                event.currentTarget.releasePointerCapture(event.pointerId);
                              }
                            }}
                          >
                            <div className="dashCustomSliderTrack" />
                            <div className="dashCustomSliderFill" style={{ width: `${bubbleLeftPct}%` }} />
                            <div className="dashCustomSliderThumb" style={{ left: `${bubbleLeftPct}%` }} />
                          </div>
                          <div className="dashRangeScale" aria-hidden="true">
                            {sliderStopWidths.map((width, index) => {
                              const leftPct = widthToPercentScale(width);
                              const label = `${width}`;
                              const isFirst = index === 0;
                              const isLast = index === sliderStopWidths.length - 1;
                              const prevWidth = sliderStopWidths[index - 1];
                              const nextWidth = sliderStopWidths[index + 1];
                              const prevPct = Number.isFinite(prevWidth) ? widthToPercentScale(prevWidth) : Number.NEGATIVE_INFINITY;
                              const nextPct = Number.isFinite(nextWidth) ? widthToPercentScale(nextWidth) : Number.POSITIVE_INFINITY;
                              const crowded = leftPct - prevPct < 7 || nextPct - leftPct < 7;
                              const showLabel = isFirst || isLast || !crowded;
                              let itemTransform = "translateX(-50%)";
                              if (isFirst) {
                                itemTransform = "translateX(0)";
                              } else if (isLast) {
                                itemTransform = "translateX(-100%)";
                              }
                              return (
                                <div
                                  key={`stop-${width}`}
                                  className="dashRangeScaleItem"
                                  style={{ left: `${leftPct}%`, transform: itemTransform }}
                                >
                                  <span className="dashRangeScaleTick" />
                                  {showLabel ? <span className="dashRangeScaleLabel">{label}</span> : null}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              </section>
            </section>

            <section className="dashRightColumnShell">
              <div className="dashRightColumn">
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
                  panelRef={rightCardMeasureRef}
                />

                <TimeSeriesPanel
                  title="Life Expectancy (Years)"
                  subtitle="The average number of years a newborn is expected to live"
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
                  subtitle="The total number of residents"
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
              </div>
            </section>
          </div>
        ) : null}
      </div>
    </div>
  );
}
