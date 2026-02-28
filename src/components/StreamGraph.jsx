import { useEffect, useRef } from "react";
import * as d3 from "d3";

export default function StreamGraph({
  onDiseaseSelect = null,
  diseases = null,
  yScale = "symlog",
  title = null,
}) {
  const svgRef = useRef();

  useEffect(() => {
    const width = 900;
    const height = 420;
    const margin = { top: 30, right: 30, bottom: 40, left: 80 };

    d3.csv("/data/stream-graph-total-deaths.csv").then((raw) => {
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

      let series = Array.from(
        d3.group(data, (d) => d.disease),
        ([disease, values]) => ({
          disease,
          values: values.slice().sort((a, b) => a.year - b.year),
        })
      );

      if (diseases) {
        series = series.filter((s) => diseases.includes(s.disease));
      }

      series.forEach((s) => {
        s.maxVal = d3.max(s.values, (d) => d.val) ?? 0;
        s.totalDeaths = d3.sum(s.values, (d) => d.val);
      });

      series.sort((a, b) => b.maxVal - a.maxVal);

      const x = d3
        .scaleLinear()
        .domain([1980, 2023])
        .range([margin.left, width - margin.right]);

      const maxVal =
        d3.max(series.flatMap((s) => s.values), (d) => d.val) ?? 1;

      const y =
        yScale === "linear"
          ? d3.scaleLinear().domain([0, maxVal])
          : d3.scaleSymlog().constant(5000).domain([0, maxVal]);

      y.range([height - margin.bottom, margin.top]);

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

      const areaFlat = d3
        .area()
        .x((d) => x(d.year))
        .y0(y(0))
        .y1(y(0))
        .curve(d3.curveMonotoneX);

      const svg = d3
        .select(svgRef.current)
        .attr("viewBox", [0, 0, width, height])
        .attr("width", width)
        .attr("height", height);

      svg.selectAll("*").remove();

      // Title
      if (title) {
        svg
          .append("text")
          .attr("x", margin.left)
          .attr("y", 18)
          .attr("font-size", 13)
          .attr("font-weight", 600)
          .attr("opacity", 0)
          .text(title)
          .transition()
          .delay(1200)
          .duration(600)
          .attr("opacity", 1);
      }

      // -----------------------------
      // Draw clickable areas
      // -----------------------------
      const areas = svg
        .append("g")
        .selectAll(".area")
        .data(series, (d) => d.disease)
        .join("path")
        .attr("class", "area")
        .attr("fill", (d) => color(d.disease))
        .attr("d", (d) => areaFlat(d.values))
        .attr("opacity", 0.55)
        .attr("stroke", "#111")
        .attr("stroke-width", 0.5)
        .style("cursor", "pointer")
        .on("click", function (event, d) {
          if (onDiseaseSelect) {
            onDiseaseSelect(d.disease);
          }
        })
        .on("mouseover", function () {
          d3.select(this)
            .attr("opacity", 0.85)
            .attr("stroke-width", 1.5);
        })
        .on("mouseout", function () {
          d3.select(this)
            .attr("opacity", 0.55)
            .attr("stroke-width", 0.5);
        });

      // Animate rise
      areas
        .transition()
        .delay((d, i) => i * 120)
        .duration(1400)
        .ease(d3.easeCubicOut)
        .attr("d", (d) => area(d.values));

      // Axes
      const xAxis = svg
        .append("g")
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .attr("opacity", 0)
        .call(d3.axisBottom(x).tickFormat(d3.format("d")));

      const yAxis = svg
        .append("g")
        .attr("transform", `translate(${margin.left},0)`)
        .attr("opacity", 0)
        .call(
          d3.axisLeft(y)
            .tickValues(
              yScale === "linear"
                ? undefined
                : [0, 1e3, 5e3, 1e4, 5e4, 1e5, 5e5, 1e6, 5e6, 1e7]
            )
            .tickFormat(d3.format(".2s"))
            .tickSizeOuter(0)
            .tickPadding(8)
        )
        .call((g) => g.select(".domain").attr("stroke-width", 1.2));

      xAxis.transition().delay(1500).duration(600).attr("opacity", 1);
      yAxis.transition().delay(1500).duration(600).attr("opacity", 1);

      svg
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", 20)
        .attr("text-anchor", "middle")
        .attr("font-size", 12)
        .attr("opacity", 0)
        .text("Number of deaths")
        .transition()
        .delay(1600)
        .duration(600)
        .attr("opacity", 1);

      // Tooltip
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

          const datum = d3.select(topArea).datum();
          const disease = datum.disease;
          const total = datum.totalDeaths;
          const bandColor = color(disease);

          tooltip
            .style("opacity", 1)
            .style("background", bandColor)
            .style("color", "white")
            .html(`
              <div style="font-weight:600; margin-bottom:4px;">
                ${disease}
              </div>
              <div style="font-size:13px;">
                Total deaths (1980–2023):
              </div>
              <div style="font-size:14px; font-weight:600;">
                ${d3.format(",")(Math.round(total))}
              </div>
            `)
            .style("left", `${mx + 14}px`)
            .style("top", `${my + 14}px`);
        })
        .on("mouseleave", () => {
          tooltip.style("opacity", 0);
        });
    });
  }, [diseases, yScale, title, onDiseaseSelect]);

  return (
    <div style={{ position: "relative", width: 900 }}>
      <svg ref={svgRef} />
      <div
        id="stream-tooltip"
        style={{
          position: "absolute",
          pointerEvents: "none",
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