import { useEffect, useRef } from "react";
import * as d3 from "d3";

export default function StreamGraph() {
  const svgRef = useRef();

  useEffect(() => {
    const width = 900;
    const height = 420;
    const margin = { top: 30, right: 30, bottom: 40, left: 80 };

    d3.csv("/data/stream-graph-total-deaths.csv").then((raw) => {
      /* -------------------------------------------------
         1. Load + filter data (GLOBAL, Number, val only)
      ------------------------------------------------- */
      const data = raw
        .filter(
          (d) =>
            d.location_name === "Global" &&
            d.metric_name === "Number"
        )
        .map((d) => ({
          year: +d.year,
          disease: d.cause_name,
          val: +d.val,
        }));

      /* -------------------------------------------------
         2. Group by disease, sort by year
      ------------------------------------------------- */
      const series = Array.from(
        d3.group(data, (d) => d.disease),
        ([disease, values]) => ({
          disease,
          values: values.slice().sort((a, b) => a.year - b.year),
        })
      );

      /* -------------------------------------------------
         3. Sort draw order (large first → small on top)
      ------------------------------------------------- */
      series.forEach((s) => {
        s.maxVal = d3.max(s.values, (d) => d.val) ?? 0;
      });
      series.sort((a, b) => b.maxVal - a.maxVal);

      /* -------------------------------------------------
         4. Scales (symlog for readability)
      ------------------------------------------------- */
      const x = d3
        .scaleLinear()
        .domain(d3.extent(data, (d) => d.year))
        .range([margin.left, width - margin.right]);

      const maxVal = d3.max(data, (d) => d.val) ?? 1;

      const y = d3
        .scaleSymlog()
        .constant(5000)
        .domain([0, maxVal])
        .range([height - margin.bottom, margin.top]);

      const color = d3
        .scaleOrdinal()
        .domain(series.map((s) => s.disease))
        .range(d3.schemeTableau10);

      const area = d3
        .area()
        .x((d) => x(d.year))
        .y0(y(0))
        .y1((d) => y(d.val))
        .curve(d3.curveMonotoneX);

      /* -------------------------------------------------
         5. SVG setup
      ------------------------------------------------- */
      const svg = d3
        .select(svgRef.current)
        .attr("viewBox", [0, 0, width, height])
        .attr("width", width)
        .attr("height", height);

      svg.selectAll("*").remove();

      /* -------------------------------------------------
         6. Draw filled areas (visual + hit-testable)
      ------------------------------------------------- */
      svg
        .append("g")
        .selectAll(".area")
        .data(series, (d) => d.disease)
        .join("path")
        .attr("class", "area")
        .attr("fill", (d) => color(d.disease))
        .attr("d", (d) => area(d.values))
        .attr("opacity", 0.55)
        .attr("stroke", "#111")
        .attr("stroke-width", 0.5);

      /* -------------------------------------------------
         7. Axes
      ------------------------------------------------- */
      svg
        .append("g")
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x).tickFormat(d3.format("d")));

      svg
        .append("g")
        .attr("transform", `translate(${margin.left},0)`)
        .call(
          d3.axisLeft(y)
            .tickValues([0, 1e3, 5e3, 1e4, 5e4, 1e5, 5e5, 1e6, 5e6, 1e7])
            .tickFormat(d3.format(".2s"))
        );

      svg
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", 20)
        .attr("text-anchor", "middle")
        .attr("font-size", 12)
        .text("Number of deaths");

      /* -------------------------------------------------
         8. Tooltip logic — TOPMOST visible area
      ------------------------------------------------- */
      const tooltip = d3.select("#stream-tooltip");

      svg
        .on("mousemove", function (event) {
          const [mx, my] = d3.pointer(event, svg.node());

          const elements = document.elementsFromPoint(
            event.clientX,
            event.clientY
          );

          const topArea = elements.find(
            (el) =>
              el.tagName === "path" &&
              el.classList.contains("area")
          );

          if (!topArea) {
            tooltip.style("opacity", 0);
            return;
          }

          const disease = d3.select(topArea).datum().disease;

          tooltip
            .style("opacity", 1)
            .html(`<strong>${disease}</strong>`)
            .style("left", `${mx + 14}px`)
            .style("top", `${my + 14}px`);
        })
        .on("mouseleave", () => {
          tooltip.style("opacity", 0);
        });
    });
  }, []);

  return (
    <div style={{ position: "relative", width: 900 }}>
      <svg ref={svgRef} />
      <div
        id="stream-tooltip"
        style={{
          position: "absolute",
          pointerEvents: "none",
          background: "rgba(0,0,0,0.85)",
          color: "white",
          padding: "8px 12px",
          borderRadius: "8px",
          fontSize: "14px",
          lineHeight: "1.3",
          maxWidth: "220px",
          opacity: 0,
          transition: "opacity 0.15s ease",
          whiteSpace: "normal",
        }}
      />
    </div>
  );
}