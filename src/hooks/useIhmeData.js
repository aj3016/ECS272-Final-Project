import { useEffect, useMemo, useState } from "react";

const GEOJSON_URL = "/data/countries_geojson.json";
const JSON_URL = "/data/country_cleaned.json";

export const ISO_PROP = "ISO3166-1-Alpha-3";
export const NAME_PROP = "name";

function safeNum(x) {
  const v = Number(x);
  return Number.isFinite(v) ? v : null;
}

export function useIhmeData() {
  const [countriesGeo, setCountriesGeo] = useState(null);
  const [valuesByDiseaseYear, setValuesByDiseaseYear] = useState(() =>
    Object.create(null)
  );
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

        const vbd = Object.create(null);
        const diseaseSet = new Set();
        const yearSet = new Set();

        for (const r of rows) {
          const iso3 = (r.iso3 || "").trim();
          if (!iso3) continue;

          const year = Number(r.year);
          if (!Number.isFinite(year)) continue;

          const disease = (r.cause_name || "").trim();
          if (!disease) continue;

          const val = safeNum(r.val);
          if (val === null) continue;

          diseaseSet.add(disease);
          yearSet.add(year);

          vbd[disease] ??= Object.create(null);
          vbd[disease][year] ??= Object.create(null);
          vbd[disease][year][iso3] = val;
        }

        const dList = Array.from(diseaseSet).sort();
        const yList = Array.from(yearSet).sort((a, b) => a - b);

        if (!alive) return;
        setCountriesGeo(geo);
        setValuesByDiseaseYear(vbd);
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
    valuesByDiseaseYear,
    diseases,
    years,
    loading,
    error,
    defaults,
  };
}
