export function computeThresholds(
  valuesByDiseaseYear,
  disease,
  year,
  metric = "rate",
  scaleMode = "year"
) {
  const d = valuesByDiseaseYear?.[disease];
  if (!d) return null;

  let raw = [];

  if (scaleMode === "global") {
    for (const yKey of Object.keys(d)) {
      const perYear = d[yKey];
      if (!perYear) continue;
      for (const v of Object.values(perYear)) {
        if (Number.isFinite(v) && v > 0) raw.push(v);
      }
    }
  } else {
    const perYear = d?.[year];
    if (!perYear) return null;
    raw = Object.values(perYear).filter((v) => Number.isFinite(v) && v > 0);
  }

  if (raw.length < 10) return null;

  function quantiles(sortedVals) {
    const n = sortedVals.length;
    const q = (p) => sortedVals[Math.floor((n - 1) * p)];
    return [q(0.2), q(0.4), q(0.6), q(0.8)];
  }

  if (metric === "number") {
    const logs = raw.map((v) => Math.log1p(v)).sort((a, b) => a - b);
    const [lt1, lt2, lt3, lt4] = quantiles(logs);
    return [Math.expm1(lt1), Math.expm1(lt2), Math.expm1(lt3), Math.expm1(lt4)];
  }

  raw.sort((a, b) => a - b);
  return quantiles(raw);
}