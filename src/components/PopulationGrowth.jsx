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
      const heightFromRatio = width * 0.18;  
      const maxHeight = window.innerHeight * 0.22;
      const minHeight = 120;
      const height = Math.max(minHeight, Math.min(heightFromRatio, maxHeight));
      setDimensions({ width, height });
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    d3.csv("/data/pop-growth-rate.csv").then((raw) => {
      const countryCol = Object.keys(raw[0]).find((k) => k.trim() === "Country Name");
      const worldRow = raw.find((d) => String(d[countryCol] ?? "").trim().toLowerCase() === "world");
      const yearKeys = Object.keys(worldRow).filter((k) => /\b(19|20)\d{2}\b/.test(k));
      const parsed = yearKeys
        .map((k) => ({
          year: +k.match(/\b(19|20)\d{2}\b/)[0],
          value: +String(worldRow[k] ?? "").trim(),
        }))
        .filter((d) => Number.isFinite(d.year) && Number.isFinite(d.value) && d.year >= 1980 && d.year <= 2023)
        .sort((a, b) => a.year - b.year);
      setData(parsed);
    });
  }, []);

  // drawing effect
  useEffect(() => {
    if (!data) return;
    const { width, height } = dimensions;
    if (!width || !height) return;

    const margin = {
      top: height * 0.08,
      right: width * 0.02,
      bottom: height * 0.12,
      left: width * 0.035,
    };

    const svg = d3.select(svgRef.current)
      .attr("viewBox", [0, 0, width, height])
      .attr("preserveAspectRatio", "xMidYMid meet");

    svg.selectAll("*").interrupt();
    svg.selectAll("*").remove();

    const tooltip = d3.select("#pop-tooltip");
    const fmtYear = d3.format("d");
    const fmtPercent = d3.format(".2f");

    const x = d3.scaleLinear().domain([1980, 2023]).range([margin.left, width - margin.right]);
    const y = d3.scaleLinear().domain(d3.extent(data, (d) => d.value)).nice().range([height - margin.bottom, margin.top]);

    const line = d3.line().x((d) => x(d.year)).y((d) => y(d.value)).curve(d3.curveMonotoneX);

    const cursor = svg.append("line")
      .attr("class", "year-cursor")
      .attr("y1", margin.top)
      .attr("y2", height - margin.bottom)
      .attr("stroke", "#444")
      .attr("stroke-width", 1.5)
      .attr("opacity", 0);

    svg.append("rect")
      .attr("x", margin.left)
      .attr("y", margin.top)
      .attr("width", width - margin.left - margin.right)
      .attr("height", height - margin.top - margin.bottom)
      .attr("fill", "transparent")
      .on("mousemove", function(event) {
        const [mx] = d3.pointer(event, this);
        const year = Math.round(x.invert(mx));
        const point = data.find(d => d.year === year);
        if (!point) return;

        const prev = data.find(d => d.year === year - 1);
        let changeFormatted = "N/A";
        let trendColor = "#666";

        if (prev) {
          const change = point.value - prev.value;
          // Note: In growth rate context, a negative change usually means the rate is slowing down
          trendColor = change >= 0 ? "#45bf4d" : "#d73027";
          changeFormatted = (change > 0 ? "+" : "") + fmtPercent(change) + "%";
        }

        tooltip.style("opacity", 1)
          .html(`
            <div style="font-weight:700; border-bottom:1px solid #eee; margin-bottom:8px; padding-bottom:4px; font-size:14px; color:#111;">
              ${fmtYear(year)}
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px; gap:12px;">
              <span style="font-size:12px; color:#555;">Growth Rate</span>
              <span style="font-size:13px; font-weight:600; color:#111;">${fmtPercent(point.value)}%</span>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; gap:12px;">
              <span style="font-size:12px; color:#555;">Yearly Change</span>
              <span style="font-size:12px; font-weight:600; color:${trendColor};">
                ${changeFormatted}
              </span>
            </div>
          `);

        const node = tooltip.node();
        let left = mx + 15;
        if (left + node.offsetWidth > width) left = mx - node.offsetWidth - 15;

        tooltip.style("left", `${left}px`).style("top", `${margin.top}px`);

        cursor.attr("x1", x(year)).attr("x2", x(year)).attr("opacity", 1);
        window.dispatchEvent(new CustomEvent("hoverYear", { detail: { year, source: "pop" } }));
      })
      .on("mouseleave", () => {
        cursor.attr("opacity", 0);
        tooltip.style("opacity", 0);
        window.dispatchEvent(new CustomEvent("hoverOff"));
      });

    const path = svg.append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", "#222")
      .attr("stroke-width", 2.5)
      .attr("d", line);

    if (!svgRef.current.__animated) {
      const totalLength = path.node().getTotalLength();
      path.attr("stroke-dasharray", totalLength).attr("stroke-dashoffset", totalLength)
        .transition().duration(1600).ease(d3.easeCubicOut).attr("stroke-dashoffset", 0);
      svgRef.current.__animated = true;
    }

    svg.append("g").attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x).ticks(8).tickFormat(d3.format("d")).tickSizeOuter(0));

    svg.append("g").attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y).ticks(4).tickFormat((d) => `${d}%`));

    svg.append("text").attr("x", margin.left).attr("y", 12).attr("font-size", 12).attr("font-weight", 700).attr("fill", "#111")
      .text("Global Population Growth Rate (%)");

  }, [dimensions, data]);

  return (
    <div ref={containerRef} style={{ width: "100%", position: "relative" }}>
      <svg ref={svgRef} style={{ width: "100%", height: "100%" }} />
      <div
        id="pop-tooltip"
        style={{
          position: "absolute",
          pointerEvents: "none",
          padding: "10px 14px",
          borderRadius: "8px",
          fontSize: "13px",
          background: "rgba(255, 255, 255, 0.96)",
          color: "#333",
          boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
          border: "1px solid #ddd",
          opacity: 0,
          transition: "opacity 0.15s ease",
          zIndex: 1000,
          minWidth: "160px"
        }}
      />
    </div>
  );
}