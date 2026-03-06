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

const ANNOTATIONS = [
  { 
    year: 2000, 
    text: "Measles Vaccine Coverage Improves",
    disease: "Measles",
    yOffset: 50
  },
  { 
    year: 2004, 
    text: "HIV/AIDS Peak", 
    disease: "HIV/AIDS",
    yOffset: 20 // Highest
  },
  { 
    year: 2014, 
    text: "Ebola Outbreak", 
    disease: "Ebola",
    yOffset: 70 // Middle
  },
  { 
    year: 2021, 
    text: "COVID-19 Spike", 
    disease: "COVID-19",
    yOffset: 20 // Lowest
  }
];

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

  useEffect(() => {
    function handleResize() {
      if (!containerRef.current) return;
      const width = containerRef.current.clientWidth;
      const height = Math.max(220, Math.min(width * 0.35, window.innerHeight * 0.42));
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

  useEffect(() => {
    const { width, height } = dimensions;
    if (!width || !height || !data) return;

    const margin = {
      top: height * 0.08,
      right: width * 0.02,
      bottom: height * 0.12,
      left: width * 0.035,
    };

    const svg = d3.select(svgRef.current)
      .attr("viewBox", [0, 0, width, height])
      .attr("preserveAspectRatio", "xMidYMid meet");

    svg.selectAll("*").remove();

    const tooltip = d3.select("#stream-tooltip");
    const fmtNumber = d3.format(",");

    const filtered = diseases ? data.filter((d) => diseases.includes(d.disease)) : data;
    const years = Array.from(new Set(filtered.map((d) => d.year))).sort((a, b) => a - b);
    const diseaseNames = Array.from(new Set(filtered.map((d) => d.disease)));
    const totalsByYear = d3.rollup(filtered, v => d3.sum(v, d => d.val), d => d.year);

    const x = d3.scaleLinear()
      .domain(d3.extent(years))
      .range([margin.left, width - margin.right]);

    const nested = years.map((year) => {
      const row = { year };
      diseaseNames.forEach((name) => {
        const found = filtered.find(d => d.year === year && d.disease === name);
        row[name] = found ? found.val : 0;
      });
      return row;
    });

    const stack = d3.stack()
      .keys(diseaseNames)
      .order(d3.stackOrderInsideOut)
      .offset(d3.stackOffsetWiggle);

    const layers = stack(nested);

    const y = d3.scaleLinear()
      .domain([
        d3.min(layers, l => d3.min(l, d => d[0])),
        d3.max(layers, l => d3.max(l, d => d[1]))
      ])
      .range([height - margin.bottom, margin.top]);

    const area = d3.area()
      .x(d => x(d.data.year))
      .y0(d => y(d[0]))
      .y1(d => y(d[1]))
      .curve(d3.curveCatmullRom);

    const areaFlat = d3.area()
      .x(d => x(d.data.year))
      .y0(y(0))
      .y1(y(0))
      .curve(d3.curveCatmullRom);

    svg.append("g")
      .selectAll("path")
      .data(layers)
      .join("path")
      .attr("class", "area-path")
      .attr("fill", d => DISEASE_COLORS[d.key] || "#999")
      .attr("d", areaFlat)
      .style("cursor", "pointer")
      .on("click", (event, d) => {
        if (onDiseaseSelect) onDiseaseSelect(d.key);
      })
      .transition()
      .duration(1200)
      .ease(d3.easeCubicOut)
      .attr("d", area);

    const cursor = svg.append("line")
      .attr("class", "year-cursor")
      .attr("y1", margin.top)
      .attr("y2", height - margin.bottom)
      .attr("stroke", "#444")
      .attr("stroke-width", 2)
      .attr("opacity", 0)
      .style("pointer-events", "none");

    const applyCleanTooltipStyle = (el) => {
      el.style("background", "rgba(255, 255, 255, 0.96)")
        .style("color", "#333")
        .style("box-shadow", "0 4px 12px rgba(0,0,0,0.15)")
        .style("border", "1px solid #ddd");
    };

    function handleExternalHover(event) {
      const { year, source } = event.detail;
      if (source === "stream") return;
      
      cursor.attr("x1", x(year)).attr("x2", x(year)).attr("opacity", 1).raise();
      
      const total = totalsByYear.get(year);
      applyCleanTooltipStyle(tooltip);
      
      tooltip.style("opacity", 1)
        .html(`
          <div style="font-weight:700; border-bottom:1px solid #eee; margin-bottom:8px; padding-bottom:4px; font-size:15px;">${year}</div>
          <div style="display:flex; justify-content:space-between; align-items:center; gap:15px;">
            <span style="font-size:12px; color:#555;">Total deaths</span>
            <span style="font-size:14px; font-weight:700; color:#111;">${fmtNumber(Math.round(total))}</span>
          </div>
        `);
      
      let left = x(year) + 12;
      const node = tooltip.node();
      const tooltipWidth = node ? node.offsetWidth : 220;
      if (left + tooltipWidth > width) left = x(year) - tooltipWidth - 12;
      tooltip.style("left", `${left}px`).style("top", `${margin.top + 10}px`);
    }

    window.addEventListener("hoverYear", handleExternalHover);
    window.addEventListener("hoverOff", () => {
      tooltip.style("opacity", 0);
      cursor.attr("opacity", 0);
    });

    svg.on("mousemove", function(event) {
      const [mx] = d3.pointer(event);
      const year = Math.round(x.invert(mx));
      
      // Dispatch event always to keep other graphs in sync
      window.dispatchEvent(new CustomEvent("hoverYear", { detail: { year, source: "stream" } }));

      const elements = document.elementsFromPoint(event.clientX, event.clientY);
      const topPath = elements.find(el => el.classList.contains("area-path"));

      if (topPath) {
        // Show cursor only when over a path
        cursor.attr("x1", x(year)).attr("x2", x(year)).attr("opacity", 1).raise();
        applyCleanTooltipStyle(tooltip);
        
        if (!diseases) {
          const yearData = nested.find(d => d.year === year);
          const sortedDiseases = diseaseNames
            .map(name => ({ name, val: yearData[name] }))
            .sort((a, b) => b.val - a.val);

          tooltip.style("opacity", 1)
            .html(`
              <div style="font-weight:700; border-bottom:1px solid #eee; margin-bottom:8px; padding-bottom:4px; font-size:15px;">${year}</div>
              ${sortedDiseases.map(d => `
                <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:3px; gap:15px;">
                  <div style="display:flex; align-items:center; gap:6px;">
                    <div style="width:10px; height:10px; background:${DISEASE_COLORS[d.name]}; border-radius:2px;"></div>
                    <div style="font-size:12px; font-weight:500;">${d.name}</div>
                  </div>
                  <div style="font-size:12px; font-weight:600;">${fmtNumber(Math.round(d.val))}</div>
                </div>
              `).join('')}
            `);
        } else {
          const datum = d3.select(topPath).datum();
          const disease = datum.key;
          const entry = datum.find(d => d.data.year === year);
          const val = entry ? entry.data[disease] : 0;

          tooltip.style("opacity", 1)
            .html(`
              <div style="font-weight:700; border-bottom:1px solid #eee; margin-bottom:8px; padding-bottom:4px; font-size:15px;">${year}</div>
              <div style="display:flex; align-items:center; justify-content:space-between; gap:15px;">
                <div style="display:flex; align-items:center; gap:6px;">
                  <div style="width:10px; height:10px; background:${DISEASE_COLORS[disease]}; border-radius:2px;"></div>
                  <div style="font-size:13px; font-weight:500;">${disease}</div>
                </div>
                <div style="font-size:14px; font-weight:700;">${fmtNumber(Math.round(val))}</div>
              </div>
            `);
        }
      } else {
        // Hide both if not over a band
        tooltip.style("opacity", 0);
        cursor.attr("opacity", 0);
      }

      let left = mx + 14;
      const tooltipNode = tooltip.node();
      const tooltipWidth = tooltipNode ? tooltipNode.offsetWidth : 220;
      if (left + tooltipWidth > width) left = mx - tooltipWidth - 14;
      tooltip.style("left", `${left}px`).style("top", `${margin.top + 10}px`);
    });

    svg.on("mouseleave", () => {
      tooltip.style("opacity", 0);
      cursor.attr("opacity", 0);
      window.dispatchEvent(new CustomEvent("hoverOff"));
    });

    svg.append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x).ticks(10).tickFormat(d3.format("d")))
      .attr("color", "#777");

    // --- ANNOTATIONS LAYER ---
const annotationGroup = svg.append("g").attr("class", "annotations").style("pointer-events", "none");

ANNOTATIONS.forEach(ann => {
  // Only show annotation if the disease is currently in the filtered list
  if (diseases && !diseases.includes(ann.disease)) return;

  const xPos = x(ann.year);
  
  // 1. Draw the Vertical Marker
  annotationGroup.append("line")
    .attr("x1", xPos)
    .attr("x2", xPos)
    .attr("y1", margin.top)
    .attr("y2", height - margin.bottom)
    .attr("stroke", "#333")
    .attr("stroke-width", 1)
    .attr("stroke-dasharray", "4,4")
    .attr("opacity", 0.4);

  // 2. Add the Text Label
  annotationGroup.append("text")
    .attr("x", xPos)
    .attr("y", margin.top + ann.yOffset) 
    .attr("text-anchor", (ann.year <= 2000 || ann.year > 2018) ? "end" : "start") 
    .attr("dx", (ann.year <= 2000 || ann.year > 2018) ? -15 : 15)
    .style("font-size", "12px")
    .style("font-weight", "bold")
    .style("fill", "#222")
    .style("paint-order", "stroke")
    .style("stroke", "#fff")
    .style("stroke-width", "4px")
    .text(ann.text);
  });

    return () => {
      window.removeEventListener("hoverYear", handleExternalHover);
    };
  }, [dimensions, data, diseases, onDiseaseSelect]);

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%", height: "100%" }}>
      <svg ref={svgRef} style={{ width: "100%", height: "100%" }} />
      <div id="stream-tooltip" style={{
        position: "absolute", pointerEvents: "none", padding: "10px 14px", borderRadius: "8px",
        fontSize: "13px", lineHeight: "1.2", minWidth: "180px", opacity: 0,
        transition: "opacity 0.1s ease", zIndex: 999
      }} />
    </div>
  );
}