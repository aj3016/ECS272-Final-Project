import React, { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { usePageReady } from "../state/pageReady";
import { useIhmeData, ISO_PROP, NAME_PROP } from "../hooks/useIhmeData";
import { useCountryDemographicsData } from "../hooks/useCountryDemographicsData";
import { diseaseAccent } from "../utils/color";
import DashboardHeader from "../components/dashboard/DashboardHeader";
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
    const [burdenMetric, setBurdenMetric] = useState("number");
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
      const byDiseaseYear = valuesByMetricDiseaseYear?.[burdenMetric]?.[selectedDisease] || {};
      return filteredDemoYears.map((y) => ({
        year: y,
        value: safeNum(byDiseaseYear?.[y]?.[iso3Upper]),
      }));
    }, [valuesByMetricDiseaseYear, burdenMetric, selectedDisease, filteredDemoYears, iso3Upper]);

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

  const avgSeriesByMetric = useMemo(() => {
    const buckets = {
      pop_growth: Object.create(null),
      life_expectancy: Object.create(null),
      population: Object.create(null),
    };

    for (const iso of countryIsoSet) {
      const rows = byIso3?.[iso] || [];
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

    const loading = ihmeLoading || demoLoading;
    const error = [ihmeError, demoError].filter(Boolean).join(" ");
    const accent = diseaseAccent(selectedDisease);

    const { markReady } = usePageReady();
    useEffect(() => {
      if (!loading) markReady();
    }, [loading, markReady]);

  return (
    <div className="dashboardWrap">
      <div className="dashboardCanvas dashboardContent">
        <DashboardHeader
          hasCountry={hasCountry}
          countryName={hasCountry ? countryName : "No country selected"}
          iso3={hasCountry ? iso3Upper : "—"}
          selectedDisease={selectedDisease}
          diseases={diseases}
          onDiseaseChange={setSelectedDisease}
          burdenMetric={burdenMetric}
          onMetricChange={setBurdenMetric}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          rangeWidth={effectiveRangeWidth}
          minYear={minYear}
          maxYear={maxYear}
          onRangeWidthChange={(w) => {
            const widthMax = Math.max(1, maxYear - minYear);
            const nextW = clamp(w, 1, widthMax);
            setRangeWidth(nextW);
            setRangeAnchorEnd((prev) => clamp(prev, minYear + nextW, maxYear));
            setHoverYear(null);
          }}
        />

        {!hasCountry ? (
          <div className="dashLoadingCard dashInlineCardRow">
            <span>Select a country in 2 Globe to open a full dashboard.</span>
            <Link className="btnSmall" to={`/globe?disease=${encodeURIComponent(selectedDisease)}`}>
              Go to 2 Globe
            </Link>
          </div>
        ) : null}

        {error ? (
          <div className="dashErrorCard">{error}</div>
        ) : null}

        {loading ? (
          <div className="dashLoadingCard">Loading dashboard data…</div>
        ) : null}

        <div className="dashChartsGrid">
          <TimeSeriesPanel
            title={`Disease burden (${burdenMetric === "number" ? "Number" : "Rate"})`}
            subtitle={`${selectedDisease} in ${countryName}`}
            series={burdenSeries}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            hoverYear={hoverYear}
            onHoverYear={setHoverYear}
            accent={accent}
            valueFormatter={burdenMetric === "number" ? compact : fmt2}
            unitLabel={burdenMetric === "number" ? "deaths" : "rate"}
          />

          <TimeSeriesPanel
            title="Population Growth Rate (%)"
            subtitle="Annual growth rate over time"
            series={growthSeries}
            referenceSeries={avgSeriesByMetric.pop_growth}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            hoverYear={hoverYear}
            onHoverYear={setHoverYear}
            accent="#0f766e"
            valueFormatter={fmt2}
            unitLabel="pp"
          />

          <TimeSeriesPanel
            title="Life Expectancy (Years)"
            subtitle="Before / during / after outbreak patterns"
            series={lifeSeries}
            referenceSeries={avgSeriesByMetric.life_expectancy}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            hoverYear={hoverYear}
            onHoverYear={setHoverYear}
            accent="#7c3aed"
            valueFormatter={fmt2}
            unitLabel="years"
          />

          <TimeSeriesPanel
            title="Population"
            subtitle="Country population trajectory"
            series={populationSeries}
            referenceSeries={avgSeriesByMetric.population}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            hoverYear={hoverYear}
            onHoverYear={setHoverYear}
            accent="#b45309"
            valueFormatter={compact}
            unitLabel="people"
          />
        </div>
      </div>
    </div>
  );
}
