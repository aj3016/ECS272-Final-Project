import { useEffect, useMemo, useState } from "react";

const JSON_URL = "/data/country_demographics.json";

export function useCountryDemographicsData() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        setLoading(true);
        setError("");
        const res = await fetch(JSON_URL);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!alive) return;
        setRows(Array.isArray(json) ? json : []);
      } catch (e) {
        if (!alive) return;
        setError(
          "[Error] Failed to load /public/data/country_demographics.json. Run: npm run build:data"
        );
        console.error(e);
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, []);

  const byIso3 = useMemo(() => {
    const map = Object.create(null);
    for (const r of rows) {
      const iso3 = String(r.iso3 || "").trim();
      if (!iso3) continue;
      map[iso3] ??= [];
      map[iso3].push(r);
    }
    for (const iso3 of Object.keys(map)) {
      map[iso3].sort((a, b) => Number(a.year) - Number(b.year));
    }
    return map;
  }, [rows]);

  const years = useMemo(() => {
    const set = new Set(rows.map((r) => Number(r.year)).filter(Number.isFinite));
    return Array.from(set).sort((a, b) => a - b);
  }, [rows]);

  return { rows, byIso3, years, loading, error };
}
