import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

export default function PopulationGrowth() {
  const svgRef = useRef();
  const containerRef = useRef();
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [data, setData] = useState(null);

  // resize effect
  useEffect(() => {
    function handleResize() {
      if (!containerRef.current) return;

      const width = containerRef.current.clientWidth;

      const heightFromRatio = width * 0.18;  // line graph should be compact
      const maxHeight = window.innerHeight * 0.22;
      const minHeight = 120;

      const height = Math.max(
        minHeight,
        Math.min(heightFromRatio, maxHeight)
      );

      setDimensions({ width, height });
    }

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
  d3.csv("/data/pop-growth-rate.csv").then((raw) => {
    const countryCol = Object.keys(raw[0]).find(
      (k) => k.trim() === "Country Name"
    );

    const worldRow = raw.find(
      (d) =>
        String(d[countryCol] ?? "").trim().toLowerCase() === "world"
    );

    const yearKeys = Object.keys(worldRow).filter((k) =>
      /\b(19|20)\d{2}\b/.test(k)
    );

    const parsed = yearKeys
      .map((k) => ({
        year: +k.match(/\b(19|20)\d{2}\b/)[0],
        value: +String(worldRow[k] ?? "").trim(),
      }))
      .filter(
        (d) =>
          Number.isFinite(d.year) &&
          Number.isFinite(d.value) &&
          d.year >= 1980 &&
          d.year <= 2023
      )
      .sort((a, b) => a.year - b.year);

    setData(parsed);
  });
}, []);

  // drawing effect
  useEffect(() => {
  if (!data) return;          // wait for data
  const { width, height } = dimensions;
  if (!width || !height) return;

  const margin = { top: 18, right: 30, bottom: 40, left: 80 };

  const svg = d3
    .select(svgRef.current)
    .attr("viewBox", [0, 0, width, height])
    .attr("preserveAspectRatio", "xMidYMid meet");

  svg.selectAll("*").interrupt(); // 🔥 stop old transitions
  svg.selectAll("*").remove();

  const x = d3
    .scaleLinear()
    .domain([1980, 2023])
    .range([margin.left, width - margin.right]);

  const y = d3
    .scaleLinear()
    .domain(d3.extent(data, (d) => d.value))
    .nice()
    .range([height - margin.bottom, margin.top]);

  const line = d3
    .line()
    .x((d) => x(d.year))
    .y((d) => y(d.value))
    .curve(d3.curveMonotoneX);

  const path = svg
    .append("path")
    .datum(data)
    .attr("fill", "none")
    .attr("stroke", "#111")
    .attr("stroke-width", 2)
    .attr("d", line);

  // Animate only once
  if (!svgRef.current.__animated) {
    const totalLength = path.node().getTotalLength();

    path
      .attr("stroke-dasharray", totalLength)
      .attr("stroke-dashoffset", totalLength)
      .transition()
      .duration(1600)
      .ease(d3.easeCubicOut)
      .attr("stroke-dashoffset", 0);

    svgRef.current.__animated = true;
  }

  svg.append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x).tickFormat(d3.format("d")));

  svg.append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y).ticks(4).tickFormat((d) => `${d}%`));

  svg.append("text")
    .attr("x", margin.left)
    .attr("y", 12)
    .attr("font-size", 12)
    .attr("font-weight", 600)
    .text("Global population growth rate (%)");

}, [dimensions, data]);

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", position: "relative" }}
    >
      <svg ref={svgRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}