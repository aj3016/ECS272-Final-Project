export function buildSparkPath(series, xScale, yScale) {
  let path = "";
  let started = false;

  for (const p of series) {
    const v = p?.value;

    if (!Number.isFinite(v)) {
      started = false;
      continue;
    }

    const year = Number(p.year);
    if (!Number.isFinite(year)) {
      started = false;
      continue;
    }

    const x = xScale(year);
    const y = yScale(v);

    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      started = false;
      continue;
    }

    if (!started) {
      path += `M ${x} ${y}`;
      started = true;
    } else {
      path += ` L ${x} ${y}`;
    }
  }

  return path;
}