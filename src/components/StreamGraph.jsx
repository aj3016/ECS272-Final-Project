import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

const DISEASE_COLORS = {
  "COVID-19": "#748f12",
  "Influenza": "#45bf4d",
  "HIV/AIDS": "#e7298a",
  "Measles": "#d73027",
  "Malaria": "#e1a33f",
  "Ebola": "#090802",
  "Dengue": "#a44bed",
};

export default function StreamGraph({
  onDiseaseSelect = null,
  diseases = null,
  yScale = "linear",
  title = null,
}) {
  const svgRef = useRef();
  const containerRef = useRef();
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [data, setData] = useState(null);

  // resize
  useEffect(() => {
    function handleResize() {
      if (!containerRef.current) return;

      const width = containerRef.current.clientWidth;
      const heightFromRatio = width * 0.35;
      const maxHeight = window.innerHeight * 0.42;
      const minHeight = 220;

      const height = Math.max(minHeight, Math.min(heightFromRatio, maxHeight));
      setDimensions({ width, height });
    }

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
  d3.csv("/data/stream-graph-total-deaths.csv").then((raw) => {
    const parsed = raw
      .filter((d) => d.location_name === "Global" && d.metric_name === "Number")
      .map((d) => ({
        year: +d.year,
        disease: d.cause_name,
        val: +d.val,
      }));

    setData(parsed);
  });
}, []);

  // draw
  useEffect(() => {
    const { width, height } = dimensions;
    if (!width || !height) return;

    const isOverview = !diseases;

    const margin = {
    top: height * 0.08,
    right: width * 0.02,
    bottom: height * 0.12,
    left: width * 0.035,
  };

    const svg = d3
      .select(svgRef.current)
      .attr("viewBox", [0, 0, width, height])
      .attr("preserveAspectRatio", "xMidYMid meet");

    svg.selectAll("*").interrupt();
    svg.selectAll("*").remove();

    const tooltip = d3.select("#stream-tooltip");
    const fmtYear = d3.format("d");
    const fmtNumber = d3.format(",");

    if (!data) return;
    const base = data;

      const filtered = diseases
        ? base.filter((d) => diseases.includes(d.disease))
        : base;

      const years = Array.from(new Set(filtered.map((d) => d.year))).sort(
        (a, b) => a - b
      );

      const diseaseNames = Array.from(
        new Set(filtered.map((d) => d.disease))
      );

      const totalsByYear = d3.rollup(
  filtered,
  (v) => d3.sum(v, (d) => d.val),
  (d) => d.year
);

      const x = d3
        .scaleLinear()
        .domain(d3.extent(years))
        .range([margin.left, width - margin.right]);

      const cursor = svg
        .append("line")
        .attr("class", "year-cursor")
        .attr("y1", margin.top)
        .attr("y2", height - margin.bottom)
        .attr("stroke", "#222")
        .attr("stroke-width", 1.5)
        .attr("opacity", 0)
        .raise();

  function handleHover(event) {
      const { year, source } = event.detail;

      // move the vertical cursor
      cursor
        .attr("x1", x(year))
        .attr("x2", x(year))
        .attr("opacity", 1);

      // if event came from stream graph, do nothing here
      // (stream graph mousemove already renders its own tooltip)
      if (source === "stream") return;

      // otherwise this is coming from the population line chart
      const total = totalsByYear.get(year);

      tooltip
        .style("opacity", 1)
        .style("background", "#333")
        .style("color", "white")
        .html(`
          <div style="font-weight:600;">${year}</div>
          <div>Total deaths (all diseases)</div>
          <div style="font-size:15px;font-weight:600;">
            ${fmtNumber(Math.round(total))}
          </div>
        `);

      const tooltipNode = tooltip.node();
      const tooltipWidth = tooltipNode.offsetWidth;

      let left = x(year) + 12;

      const containerWidth = containerRef.current.clientWidth;

      if (left + tooltipWidth > containerWidth - 10) {
        left = x(year) - tooltipWidth - 12;
      }

      tooltip
        .style("left", `${left}px`)
        .style("top", `${margin.top + 10}px`);
    }

  window.addEventListener("hoverYear", handleHover);

  function hideStreamHover() {
    tooltip.style("opacity", 0);
    cursor.attr("opacity", 0);
  }

  function handleHoverOff() {
    hideStreamHover();
  }

  window.addEventListener("hoverOff", handleHoverOff);

      // overview (stacked + boosted for visibility)
      if (isOverview) {

        const alpha = 0.4; // visibility boost

        const nested = years.map((year) => {
          const row = { year };
          diseaseNames.forEach((name) => {
            const found = filtered.find(
              (d) => d.year === year && d.disease === name
            );
            const rawVal = found ? found.val : 0;
            row[name] = Math.pow(rawVal, alpha);
          });
          return row;
        });

        const stack = d3
          .stack()
          .keys(diseaseNames)
          .order(d3.stackOrderDescending)
          .offset(d3.stackOffsetNone);

        const layers = stack(nested);

        const y = d3
          .scaleLinear()
          .domain([
            0,
            d3.max(layers, (layer) =>
              d3.max(layer, (d) => d[1])
            ),
          ])
          .range([height - margin.bottom, margin.top]);

        const color = (disease) => DISEASE_COLORS[disease] || "#999";

        const area = d3
          .area()
          .x((d) => x(d.data.year))
          .y0((d) => y(d[0]))
          .y1((d) => y(d[1]))
          .curve(d3.curveMonotoneX);

        const areaFlat = d3
          .area()
          .x((d) => x(d.data.year))
          .y0(y(0))
          .y1(y(0))
          .curve(d3.curveMonotoneX);

        const paths = svg
          .append("g")
          .selectAll("path")
          .data(layers, (d) => d.key)
          .join("path")
          .attr("class", "area")
          .attr("fill", (d) => color(d.key))
          .attr("stroke", "#111")
          .attr("stroke-width", 0.5)
          .attr("opacity", 0.75)
          .attr("d", (d) => areaFlat(d))
          .style("cursor", "pointer")
          .on("click", (event, d) => {
            if (onDiseaseSelect) onDiseaseSelect(d.key);
          })
          .on("mouseover", function () {
            d3.select(this).attr("opacity", 0.95);
          })
          .on("mouseout", function () {
            d3.select(this).attr("opacity", 0.75);
          });

        paths
          .transition()
          .duration(1200)
          .ease(d3.easeCubicOut)
          .attr("d", (d) => area(d));

        // X axis only
        svg
          .append("g")
          .attr("transform", `translate(0,${height - margin.bottom})`)
          .call(d3.axisBottom(x).tickFormat(fmtYear));

        // Tooltip
        svg.on("mousemove", function (event) {

    const elements = document.elementsFromPoint(
      event.clientX,
      event.clientY
    );

    const topArea = elements.find(
      (el) => el.tagName === "path" && el.classList.contains("area")
    );

    if (!topArea) {
    tooltip.style("opacity", 0);
    cursor.attr("opacity", 0);
    return;
  }

  const datum = d3.select(topArea).datum();
  const disease = datum.key;

  const [mx, my] = d3.pointer(event, svg.node());

  const year = Math.round(x.invert(mx));
  const deathsThisYear = filtered.find(
    (d) => d.year === year && d.disease === disease
  )?.val ?? 0;

  // move cursor
  cursor
    .attr("x1", x(year))
    .attr("x2", x(year))
    .attr("opacity", 1);

  tooltip
    .style("opacity", 1)
    .style("background", color(disease))
    .style("color", "white")
    .html(`
      <div style="font-weight:600; margin-bottom:4px;">
        ${disease}
      </div>
      <div style="font-size:13px;">
        ${year}
      </div>
      <div style="font-size:14px; font-weight:600;">
        ${fmtNumber(Math.round(deathsThisYear))} deaths
      </div>
    `);
    const tooltipNode = tooltip.node();
    const tooltipWidth = tooltipNode.offsetWidth;

    let left = mx + 14;

    if (left + tooltipWidth > width - 10) {
      left = mx - tooltipWidth - 14;
    }

    tooltip.style("left", `${left}px`)
        .style("top", `${margin.top + 10}px`);

    }).on("mouseleave", () => {
      hideStreamHover();
    });

        return;
      }

      let series = Array.from(
        d3.group(filtered, (d) => d.disease),
        ([disease, v]) => ({
          disease,
          values: v.slice().sort((a, b) => a.year - b.year),
          totalDeaths: d3.sum(v, (d) => d.val),
        })
      );

      series.forEach((s) => {
        s.maxVal = d3.max(s.values, (d) => d.val) ?? 0;
      });

      series.sort((a, b) => b.maxVal - a.maxVal);

      const maxVal =
        d3.max(series.flatMap((s) => s.values), (d) => d.val) ?? 1;

      const y =
        yScale === "linear"
          ? d3.scaleLinear().domain([0, maxVal])
          : d3.scaleSymlog().constant(5000).domain([0, maxVal]);

      y.range([height - margin.bottom, margin.top]);

      const color = (disease) => DISEASE_COLORS[disease] || "#999";

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

      const areas = svg
        .append("g")
        .selectAll(".area")
        .data(series, (d) => d.disease)
        .join("path")
        .attr("class", "area")
        .attr("fill", (d) => color(d.disease))
        .attr("stroke", "#111")
        .attr("stroke-width", 0.5)
        .attr("opacity", 0.55)
        .attr("d", (d) => areaFlat(d.values))
        .style("cursor", "pointer")
        .on("click", (event, d) => {
          if (onDiseaseSelect) onDiseaseSelect(d.disease);
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

      areas
        .transition()
        .delay((d, i) => i * 120)
        .duration(1400)
        .ease(d3.easeCubicOut)
        .attr("d", (d) => area(d.values));

      const xAxis = svg
        .append("g")
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x).tickFormat(fmtYear));

      const yAxis = svg
        .append("g")
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(y).tickFormat(d3.format(".2s")));

      // Tooltip
      svg.on("mousemove", function (event) {
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
          cursor.attr("opacity", 0);
          return;
        }

        const datum = d3.select(topArea).datum();
        const disease = datum.disease;

const year = Math.round(x.invert(mx));

cursor
  .attr("x1", x(year))
  .attr("x2", x(year))
  .attr("opacity", 1);

window.dispatchEvent(
  new CustomEvent("hoverYear", {
    detail: { year, source: "stream" }
  })
);

const point = datum.values.find(d => d.year === year);
if (!point) return;

const deathsThisYear = point.val;

        tooltip
          .style("opacity", 1)
          .style("background", color(disease))
          .style("color", "white")
          .html(`
  <div style="font-weight:600; margin-bottom:4px;">
    ${disease}
  </div>
  <div style="font-size:13px;">
    ${year}
  </div>
  <div style="font-size:14px; font-weight:600;">
    ${fmtNumber(Math.round(deathsThisYear))} deaths
  </div>
`);
          const tooltipNode = tooltip.node();
const tooltipWidth = tooltipNode.offsetWidth;

let left = mx + 14;

if (left + tooltipWidth > width - 10) {
  left = mx - tooltipWidth - 14;
}

tooltip.style("left", `${left}px`)
          .style("top", `${margin.top + 10}px`);
      }).on("mouseleave", () => {
  hideStreamHover();
});

    return () => {
      window.removeEventListener("hoverYear", handleHover);
      window.removeEventListener("hoverOff", handleHoverOff);
    };

  }, [dimensions, diseases, yScale, title, onDiseaseSelect, data]);

  return (
    <div
      ref={containerRef}
      style={{ position: "relative", width: "100%", height: "100%" }}
    >
      <svg ref={svgRef} style={{ width: "100%", height: "100%" }} />
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
    zIndex: 10
  }}
/>
    </div>
  );
}