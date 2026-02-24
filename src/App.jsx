import React, { useEffect, useMemo, useRef, useState } from "react";
import ControlPanel from "./components/ControlPanel";
import Tooltip from "./components/Tooltip";
import DetailPanel from "./components/DetailPanel";
import { useIhmeData } from "./hooks/useIhmeData";
import { useMapboxGlobe } from "./hooks/useMapboxGlobe";

export default function App() {
  const mapContainerRef = useRef(null);

  const {
    countriesGeo,
    valuesByMetricDiseaseYear,
    diseases,
    years,
    loading,
    error,
    defaults,
  } = useIhmeData();

  const [selectedDisease, setSelectedDisease] = useState(null);
  const [selectedYear, setSelectedYear] = useState(2000);
  const [scaleMode, setScaleMode] = useState("global"); 
  const [paletteName, setPaletteName] = useState("blue"); 

  const [metric, setMetric] = useState("rate");

  const [spinEnabled, setSpinEnabled] = useState(true);

  const [playing, setPlaying] = useState(false);
  const [speedMs, setSpeedMs] = useState(700);
  const playTimerRef = useRef(null);

  const [tooltip, setTooltip] = useState({
    visible: false,
    x: 0,
    y: 0,
    value: undefined,
    feature: null,
  });

  const [detailOpen, setDetailOpen] = useState(false);
  const [clickedFeature, setClickedFeature] = useState(null);

  useEffect(() => {
    if (!defaults.defaultDisease) return;
    setSelectedDisease((prev) => prev ?? defaults.defaultDisease);
    setSelectedYear((prev) => (prev ? prev : defaults.defaultYear));
  }, [defaults.defaultDisease, defaults.defaultYear]);

  const { thresholds } = useMapboxGlobe({
    mapContainerRef,
    countriesGeo,
    valuesByMetricDiseaseYear,
    selectedDisease,
    selectedYear,
    metric,
    scaleMode,
    paletteName,
    spinEnabled,
    onHover: ({ feature, point, value }) => {
      setTooltip({ visible: true, x: point.x, y: point.y, feature, value });
    },
    onLeave: () => setTooltip((t) => ({ ...t, visible: false })),
    onCountryClick: (feature) => {
      setClickedFeature(feature);
      setDetailOpen(true);
    },
  });

  const stopPlay = () => {
    setPlaying(false);
    if (playTimerRef.current) clearInterval(playTimerRef.current);
    playTimerRef.current = null;
  };

  const startPlay = () => {
    if (playing) return;
    setPlaying(true);

    const tick = () => {
      const minY = Number(years?.[0] ?? 1970);
      const maxY = Number(years?.[years.length - 1] ?? 2024);
      setSelectedYear((prev) => {
        const next = prev >= maxY ? minY : prev + 1;
        return next;
      });
    };

    tick();
    playTimerRef.current = setInterval(tick, speedMs);
  };

  useEffect(() => {
    if (!playing) return;
    stopPlay();
    startPlay();
  }, [speedMs]);

  useEffect(() => stopPlay, []);

  const onTogglePlay = () => {
    if (playing) stopPlay();
    else startPlay();
  };

  const ready = useMemo(
    () => !loading && !error && selectedDisease && years.length > 0,
    [loading, error, selectedDisease, years.length]
  );

  return (
    <div className="mapRoot">
      <div className="mapContainer" ref={mapContainerRef} />

      {error ? (
        <div className="panel">
          <div style={{ fontWeight: 700 }}>Global Disease Globe</div>
          <div className="small" style={{ color: "#b91c1c" }}>
            {error}
          </div>
          <div className="small">
            Make sure files exist in <b>public/data/</b> and you’re running the
            dev server.
          </div>
        </div>
      ) : (
        <ControlPanel
          diseases={diseases}
          years={years}
          selectedDisease={selectedDisease || ""}
          selectedYear={selectedYear}
          onDiseaseChange={(d) => setSelectedDisease(d)}
          onYearChange={(y) => setSelectedYear(y)}
          playing={playing}
          onTogglePlay={onTogglePlay}
          speedMs={speedMs}
          onSpeedChange={(ms) => setSpeedMs(ms)}
          spinEnabled={spinEnabled}
          onSpinToggle={(v) => setSpinEnabled(v)}
          thresholds={thresholds}
          metric={metric}
          onMetricChange={(m) => setMetric(m)}
          scaleMode={scaleMode}
          onScaleModeChange={(s) => setScaleMode(s)}
          paletteName={paletteName}
          onPaletteChange={(p) => setPaletteName(p)}
        />
      )}

      <Tooltip
        visible={tooltip.visible}
        x={tooltip.x}
        y={tooltip.y}
        feature={tooltip.feature}
        disease={selectedDisease || ""}
        year={selectedYear}
        value={tooltip.value}
        metric={metric}
      />

      <DetailPanel
        open={detailOpen}
        feature={clickedFeature}
        selectedDisease={selectedDisease || ""}
        selectedYear={selectedYear}
        years={years}
        valuesByMetricDiseaseYear={valuesByMetricDiseaseYear}
        metric={metric}
        onClose={() => setDetailOpen(false)}
      />

      {!ready && !error ? (
        <div className="panel">
          <div style={{ fontWeight: 700 }}>Global Disease Globe</div>
          <div className="small">Loading data…</div>
          <div className="small">
            Expecting: <b>/public/data/countries_geojson.json</b> and{" "}
            <b>/public/data/countries.json</b>
          </div>
        </div>
      ) : null}
    </div>
  );
}