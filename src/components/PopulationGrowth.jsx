import { useEffect, useRef } from "react";
import * as d3 from "d3";

export default function PopulationGrowth() {
  const ref = useRef();

  useEffect(() => {
    const width = 900;
    const height = 160;
    const margin = { top: 18, right: 30, bottom: 40, left: 80 };

    const svg = d3
      .select(ref.current)
      .attr("viewBox", [0, 0, width, height])
      .attr("width", width)
      .attr("height", height);

    svg.selectAll("*").remove();

    const showError = (msg) => {
      svg.selectAll("*").remove();
      svg
        .append("text")
        .attr("x", margin.left)
        .attr("y", margin.top + 10)
        .attr("font-size", 12)
        .attr("font-weight", 600)
        .text("Population growth chart error");
      svg
        .append("text")
        .attr("x", margin.left)
        .attr("y", margin.top + 30)
        .attr("font-size", 12)
        .attr("fill", "#b91c1c")
        .text(msg);
    };

    d3.csv("/data/pop-growth-rate.csv")
      .then((raw) => {
        if (!raw || raw.length === 0) {
          showError("CSV did not load. Check file path.");
          return;
        }

        const countryCol =
          Object.keys(raw[0]).find((k) => k.trim() === "Country Name") ||
          Object.keys(raw[0]).find(
            (k) =>
              k.toLowerCase().includes("country") &&
              k.toLowerCase().includes("name")
          );

        if (!countryCol) {
          showError("Couldn't find Country Name column.");
          return;
        }

        const worldRow = raw.find(
          (d) =>
            String(d[countryCol] ?? "").trim().toLowerCase() === "world"
        );

        if (!worldRow) {
          showError("World row not found.");
          return;
        }

        const yearKeys = Object.keys(worldRow).filter((k) =>
          /\b(19|20)\d{2}\b/.test(k)
        );

        const data = yearKeys
          .map((k) => {
            const yearMatch = k.match(/\b(19|20)\d{2}\b/);
            const year = yearMatch ? +yearMatch[0] : NaN;
            const value = +String(worldRow[k] ?? "").trim();
            return { year, value };
          })
          .filter(
            (d) =>
              Number.isFinite(d.year) &&
              Number.isFinite(d.value) &&
              d.year >= 1980 &&
              d.year <= 2023
          )
          .sort((a, b) => a.year - b.year);

        if (data.length < 2) {
          showError("Too few data points.");
          return;
        }

        // -----------------------------
        // Scales
        // -----------------------------
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

        // -----------------------------
        // Draw animated line
        // -----------------------------
        const path = svg
          .append("path")
          .datum(data)
          .attr("fill", "none")
          .attr("stroke", "#111")
          .attr("stroke-width", 2)
          .attr("d", line);

        const totalLength = path.node().getTotalLength();

        path
          .attr("stroke-dasharray", totalLength)
          .attr("stroke-dashoffset", totalLength)
          .transition()
          .duration(1800)
          .ease(d3.easeCubicOut)
          .attr("stroke-dashoffset", 0);

        // -----------------------------
        // Axes (fade in slightly after)
        // -----------------------------
        const xAxis = svg
          .append("g")
          .attr("transform", `translate(0,${height - margin.bottom})`)
          .attr("opacity", 0)
          .call(d3.axisBottom(x).tickFormat(d3.format("d")));

        const yAxis = svg
          .append("g")
          .attr("transform", `translate(${margin.left},0)`)
          .attr("opacity", 0)
          .call(d3.axisLeft(y).ticks(4).tickFormat((d) => `${d}%`));

        xAxis
          .transition()
          .delay(1400)
          .duration(600)
          .attr("opacity", 1);

        yAxis
          .transition()
          .delay(1400)
          .duration(600)
          .attr("opacity", 1);

        // -----------------------------
        // Title (fade in)
        // -----------------------------
        svg
          .append("text")
          .attr("x", margin.left)
          .attr("y", 12)
          .attr("font-size", 12)
          .attr("font-weight", 600)
          .attr("opacity", 0)
          .text("Global population growth rate (%)")
          .transition()
          .delay(1500)
          .duration(600)
          .attr("opacity", 1);
      })
      .catch((err) => {
        showError(`Failed to load CSV: ${String(err)}`);
      });
  }, []);

  return <svg ref={ref} />;
}