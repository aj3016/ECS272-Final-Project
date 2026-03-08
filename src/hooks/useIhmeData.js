import { useEffect, useMemo, useState } from "react";

const GEOJSON_URL = "/data/countries_geojson.json";
const JSON_URL = "/data/countries.json";

export const ISO_PROP = "ISO3166-1-Alpha-3";
export const NAME_PROP = "name";

function safeNum(x) {
  const v = Number(x);
  return Number.isFinite(v) ? v : null;
}

function ensurePath(obj, k1, k2) {
  obj[k1] ??= Object.create(null);
  obj[k1][k2] ??= Object.create(null);
  return obj[k1][k2];
}

function safeText(x) {
  if (x === undefined || x === null) return null;
  const v = String(x).trim();
  return v ? v : null;
}

export function useIhmeData() {
  const [countriesGeo, setCountriesGeo] = useState(null);

  const [valuesByMetricDiseaseYear, setValuesByMetricDiseaseYear] = useState(() => ({
    rate: Object.create(null),
    number: Object.create(null),
  }));

  const [incomeGroupByYear, setIncomeGroupByYear] = useState(() => Object.create(null));
  const [diseases, setDiseases] = useState([]);
  const [years, setYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;

    async function loadAll() {
      try {
        setLoading(true);
        setError("");

        const geoRes = await fetch(GEOJSON_URL);
        const geo = await geoRes.json();

        const rows = await (await fetch(JSON_URL)).json();

        const vRate = Object.create(null);
        const vNumber = Object.create(null);
        const vIncomeGroup = Object.create(null);

        const diseaseSet = new Set();
        const yearSet = new Set();

        for (const r of rows) {
          const iso3 = (r.iso3 || "").trim();
          if (!iso3) continue;

          const year = Number(r.year);
          if (!Number.isFinite(year)) continue;

          const disease = (r.cause_name || "").trim();
          if (!disease) continue;

          diseaseSet.add(disease);
          yearSet.add(year);

          const rate = safeNum(r.val_rate);
          if (rate !== null) {
            const bucket = ensurePath(vRate, disease, year);
            bucket[iso3] = rate;
          }

          const number = safeNum(r.val_number);
          if (number !== null) {
            const bucket = ensurePath(vNumber, disease, year);
            bucket[iso3] = number;
          }

          vIncomeGroup[year] ??= Object.create(null);
          const incomeGroup = safeText(r.income_group);
          vIncomeGroup[year][iso3] =
            incomeGroup ?? "No data found";
        }

        const dList = Array.from(diseaseSet).sort();
        const yList = Array.from(yearSet).sort((a, b) => a - b);

        if (!alive) return;

        setCountriesGeo(geo);
        setValuesByMetricDiseaseYear({ rate: vRate, number: vNumber });
        setIncomeGroupByYear(vIncomeGroup);
        setDiseases(dList);
        setYears(yList);
      } catch (e) {
        if (!alive) return;
        setError(
          "Failed to load data. Check console, confirm local server, and file paths in /public/data/."
        );
        console.error(e);
      } finally {
        if (alive) setLoading(false);
      }
    }

    loadAll();
    return () => {
      alive = false;
    };
  }, []);

  const defaults = useMemo(() => {
    const defaultDisease = diseases[0] || null;
    const defaultYear = years.includes(2000) ? 2000 : years[0] ?? 2000;
    return { defaultDisease, defaultYear };
  }, [diseases, years]);

  return {
    countriesGeo,
    valuesByMetricDiseaseYear,
    incomeGroupByYear,
    diseases,
    years,
    loading,
    error,
    defaults,
  };
}