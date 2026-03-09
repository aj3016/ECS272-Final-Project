import fs from "node:fs/promises";
import path from "node:path";
import { csvParse } from "d3-dsv";

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, "public", "data");
const OUT_FILE = path.join(DATA_DIR, "country_demographics.json");

const METRICS = [
  {
    key: "pop_growth",
    file: "pop-growth-rate.csv",
  },
  {
    key: "gni_per_capita",
    file: "gni-per-capita.csv",
  },
  {
    key: "life_expectancy",
    file: "life-expectancy.csv",
  },
  {
    key: "population",
    file: "population.csv",
  },
];

const LONG_FORMAT_METRICS = [
  {
    file: "AgeGroup_as_%of_total_population.csv",
    indicatorToKey: {
      "SP.POP.0014.TO.ZS": "age_0_14_pct",
      "SP.POP.1564.TO.ZS": "age_15_64_pct",
      "SP.POP.65UP.TO.ZS": "age_65_plus_pct",
    },
  },
];

function toNumber(v) {
  const trimmed = String(v ?? "").trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

function validIso3(code) {
  return /^[A-Z]{3}$/.test(code);
}

function yearColumns(row) {
  return Object.keys(row).filter((k) => /^\d{4}$/.test(k));
}

async function readCsv(fileName) {
  const fullPath = path.join(DATA_DIR, fileName);
  const raw = await fs.readFile(fullPath, "utf8");
  const cleaned = raw.replace(/^\uFEFF/, "");
  const marker = "\"Country Name\",\"Country Code\",\"Indicator Name\",\"Indicator Code\"";
  const markerIndex = cleaned.indexOf(marker);
  if (markerIndex >= 0) {
    return csvParse(cleaned.slice(markerIndex));
  }
  return csvParse(cleaned);
}

async function main() {
  const byIsoYear = new Map();
  const loaded = [];

  for (const metric of METRICS) {
    let rows;
    try {
      rows = await readCsv(metric.file);
    } catch {
      console.warn(`[warn] Missing source file for ${metric.key}: ${metric.file}`);
      continue;
    }

    loaded.push(metric);

    let addedCount = 0;

    for (const row of rows) {
      const iso3 = String(row["Country Code"] || "").trim().toUpperCase();
      if (!validIso3(iso3)) continue;

      for (const y of yearColumns(row)) {
        const value = toNumber(row[y]);
        if (value === null) continue;

        const key = `${iso3}:${y}`;
        const entry = byIsoYear.get(key) || { iso3, year: Number(y) };
        entry[metric.key] = value;
        byIsoYear.set(key, entry);
        addedCount += 1;
      }
    }

    if (addedCount === 0) {
      console.warn(
        `[warn] No values parsed for ${metric.key} from ${metric.file}. Check CSV format.`
      );
    }
  }

  for (const metricSet of LONG_FORMAT_METRICS) {
    let rows;
    try {
      rows = await readCsv(metricSet.file);
    } catch {
      console.warn(`[warn] Missing source file for long format metrics: ${metricSet.file}`);
      continue;
    }

    loaded.push({ key: "age_group_shares", file: metricSet.file });
    let addedCount = 0;

    for (const row of rows) {
      const iso3 = String(row["Country Code"] || "").trim().toUpperCase();
      if (!validIso3(iso3)) continue;

      const year = Number(row.Year);
      if (!Number.isFinite(year)) continue;

      const indicatorCode = String(row["Indicator Code"] || "").trim();
      const metricKey = metricSet.indicatorToKey[indicatorCode];
      if (!metricKey) continue;

      const value = toNumber(row.Value);
      if (value === null) continue;

      const key = `${iso3}:${year}`;
      const entry = byIsoYear.get(key) || { iso3, year };
      entry[metricKey] = value;
      byIsoYear.set(key, entry);
      addedCount += 1;
    }

    if (addedCount === 0) {
      console.warn(
        `[warn] No values parsed from ${metricSet.file}. Check CSV format and indicator codes.`
      );
    }
  }

  const rows = Array.from(byIsoYear.values()).sort((a, b) =>
    a.iso3 === b.iso3 ? a.year - b.year : a.iso3.localeCompare(b.iso3)
  );

  await fs.writeFile(OUT_FILE, `${JSON.stringify(rows, null, 2)}\n`);

  console.log(`[ok] Wrote ${rows.length} rows -> public/data/country_demographics.json`);
  if (loaded.length) {
    console.log("[ok] Sources:");
    for (const metric of loaded) console.log(`  - ${metric.key}: ${metric.file}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
