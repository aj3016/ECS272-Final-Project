export function buildSparkPath(series, xScale, yScale) {
  let path = "";
  let started = false;

  for (const p of series) {
    if (p.value === null) {
      started = false;
      continue;
    }
    const x = xScale(p.year);
    const y = yScale(p.value);
    if (!started) {
      path += `M ${x} ${y}`;
      started = true;
    } else {
      path += ` L ${x} ${y}`;
    }
  }

  return path;
}
