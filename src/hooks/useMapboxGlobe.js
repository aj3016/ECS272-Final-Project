import { useEffect, useMemo, useRef } from "react";
import mapboxgl from "mapbox-gl";
import * as turf from "@turf/turf";
import { diseaseAccent } from "../utils/color";
import { computeThresholds } from "../utils/thresholds";
import { ISO_PROP, NAME_PROP } from "./useIhmeData";
import { NO_DATA, ZERO, getPalette } from "../utils/palettes";

function buildFillExpressionFromState(thresholds, paletteName) {
  const palette = getPalette(paletteName);
  const c1 = palette[1];
  const c2 = palette[2];
  const c3 = palette[3];
  const c4 = palette[4];

  const v = ["feature-state", "value"];
  const has = ["==", ["feature-state", "hasValue"], true];

  if (!thresholds) {
    return ["case", ["!", has], NO_DATA, ["==", v, 0], ZERO, c4];
  }

  const [t1, t2, t3, t4] = thresholds;
  return [
    "case",
    ["!", has],
    NO_DATA,
    ["==", v, 0],
    ZERO,
    ["<", v, t1],
    c1,
    ["<", v, t2],
    c2,
    ["<", v, t3],
    c3,
    ["<", v, t4],
    c4,
    c4,
  ];
}

function getPerYear(valuesByMetricDiseaseYear, metric, disease, year) {
  const byMetric = valuesByMetricDiseaseYear?.[metric] || {};
  return byMetric?.[disease]?.[year] || {};
}

export function useMapboxGlobe({
  mapContainerRef,
  countriesGeo,
  valuesByMetricDiseaseYear,
  selectedDisease,
  selectedYear,
  metric,
  scaleMode,
  paletteName,
  spinEnabled,
  onHover,
  onLeave,
  onCountryClick,
}) {
  const mapRef = useRef(null);

  const userInteractingRef = useRef(false);
  const spinEnabledRef = useRef(!!spinEnabled);
  const rafRef = useRef(null);

  const prevIsoSetRef = useRef(new Set());

  const onHoverRef = useRef(onHover);
  const onLeaveRef = useRef(onLeave);
  const onCountryClickRef = useRef(onCountryClick);

  const fsRafRef = useRef(null); // ajinkya-change (throttle feature-state updates)

  useEffect(() => {
    onHoverRef.current = onHover;
  }, [onHover]);
  useEffect(() => {
    onLeaveRef.current = onLeave;
  }, [onLeave]);
  useEffect(() => {
    onCountryClickRef.current = onCountryClick;
  }, [onCountryClick]);

  useEffect(() => {
    spinEnabledRef.current = !!spinEnabled;
  }, [spinEnabled]);

  const thresholds = useMemo(() => {
    if (!selectedDisease) return null;
    const valuesByDiseaseYear = valuesByMetricDiseaseYear?.[metric];
    return computeThresholds(
      valuesByDiseaseYear,
      selectedDisease,
      selectedYear,
      metric,
      scaleMode
    );
  }, [valuesByMetricDiseaseYear, metric, selectedDisease, selectedYear, scaleMode]);

  useEffect(() => {
    let token = import.meta.env.VITE_MAPBOX_TOKEN;
    token = (token || "")
      .trim()
      .replace(/^['"]+|['"]+$/g, "")
      .replace(/;$/, "");

    if (!token) {
      console.error("Missing VITE_MAPBOX_TOKEN in .env");
      return;
    }
    mapboxgl.accessToken = token;

    if (mapRef.current || !mapContainerRef.current) return;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: [0, 20],
      zoom: 1.25,
      projection: "globe",
    });

    map.addControl(
      new mapboxgl.NavigationControl({ visualizePitch: true }),
      "bottom-right"
    );

    map.on("style.load", () => {
      map.setFog({
        range: [0.8, 8],
        color: "white",
        "high-color": "#dbeafe",
        "space-color": "#0b1020",
        "horizon-blend": 0.06,
      });
    });

    map.dragPan.enable();
    map.scrollZoom.enable();
    map.doubleClickZoom.enable();
    map.touchZoomRotate.enable();

    const onDown = () => (userInteractingRef.current = true);
    const onUp = () => (userInteractingRef.current = false);

    map.on("mousedown", onDown);
    map.on("dragstart", onDown);
    map.on("mouseup", onUp);
    map.on("dragend", onUp);

    mapRef.current = map;

    return () => {
      try {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        if (fsRafRef.current) cancelAnimationFrame(fsRafRef.current); // ajinkya-change
        map.remove();
      } catch {
      } finally {
        mapRef.current = null;
      }
    };
  }, [mapContainerRef]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !countriesGeo || !selectedDisease) return;

    const handleLoad = () => {
      if (map.getSource("countries")) return;

      map.addSource("countries", {
        type: "geojson",
        data: countriesGeo,
        promoteId: ISO_PROP,
      });

      const fillExpr = buildFillExpressionFromState(thresholds, paletteName);

      map.addLayer({
        id: "countries-fill",
        type: "fill",
        source: "countries",
        paint: {
          "fill-color": fillExpr,
          "fill-opacity": 0.84,
        },
      });

      map.addLayer({
        id: "countries-outline",
        type: "line",
        source: "countries",
        paint: {
          "line-color": diseaseAccent(selectedDisease),
          "line-width": 0.7,
        },
      });

      map.on("mousemove", "countries-fill", (e) => {
        map.getCanvas().style.cursor = "pointer";
        const f = e.features?.[0];
        if (!f) return;

        const iso3 = (f.properties?.[ISO_PROP] || "").trim();
        let value = undefined;

        if (iso3) {
          const st = map.getFeatureState({ source: "countries", id: iso3 });
          value = st?.hasValue ? st.value : undefined;
        }

        onHoverRef.current?.({ feature: f, point: e.point, value });
      });

      map.on("mouseleave", "countries-fill", () => {
        map.getCanvas().style.cursor = "";
        onLeaveRef.current?.();
      });

      map.on("click", "countries-fill", (e) => {
        const f = e.features?.[0];
        if (!f) return;

        userInteractingRef.current = true;

        try {
          const centroid = turf.centroid(f).geometry.coordinates;
          map.easeTo({ center: centroid, zoom: 3.2, duration: 900 });
        } catch (err) {
          console.warn("Could not compute centroid", err);
        }

        const clickedIso = (f.properties?.[ISO_PROP] || "").trim();
        if (clickedIso) {
          map.setFilter("countries-outline", ["==", ["get", ISO_PROP], clickedIso]);
          window.setTimeout(() => map.setFilter("countries-outline", null), 900);
        }

        onCountryClickRef.current?.(f);
      });

      scheduleFeatureStateUpdate(map); // ajinkya-change
      startSpinLoop(map);
    };

    function startSpinLoop(mapInstance) {
      const step = () => {
        rafRef.current = requestAnimationFrame(step);

        if (!spinEnabledRef.current) return;
        if (userInteractingRef.current) return;

        const zoom = mapInstance.getZoom();
        if (zoom > 2.5) return;

        const center = mapInstance.getCenter();
        center.lng -= 0.03;
        mapInstance.setCenter(center);
      };

      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(step);
    }

    function scheduleFeatureStateUpdate(mapInstance) { // ajinkya-change
      // Throttle to 1 update per animation frame
      if (fsRafRef.current) cancelAnimationFrame(fsRafRef.current);

      fsRafRef.current = requestAnimationFrame(() => {
        const perYear = getPerYear(
          valuesByMetricDiseaseYear,
          metric,
          selectedDisease,
          selectedYear
        );

        // Clear previous
        for (const iso of prevIsoSetRef.current) {
          mapInstance.setFeatureState(
            { source: "countries", id: iso },
            { hasValue: false, value: null }
          );
        }

        // Apply next
        const nextSet = new Set();
        for (const [iso3, val] of Object.entries(perYear)) {
          nextSet.add(iso3);
          mapInstance.setFeatureState(
            { source: "countries", id: iso3 },
            { hasValue: true, value: val }
          );
        }
        prevIsoSetRef.current = nextSet;
      });
    }

    if (map.loaded()) handleLoad();
    else map.once("load", handleLoad);

    // expose for the update effect via closure
    // eslint-disable-next-line no-unused-vars
    return () => {};
  }, [
    countriesGeo,
    valuesByMetricDiseaseYear,
    selectedDisease,
    selectedYear,
    metric,
    thresholds,
    paletteName,
  ]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !countriesGeo || !selectedDisease) return;
    const src = map.getSource("countries");
    if (!src) return;

    map.setPaintProperty(
      "countries-fill",
      "fill-color",
      buildFillExpressionFromState(thresholds, paletteName)
    );

    map.setPaintProperty(
      "countries-outline",
      "line-color",
      diseaseAccent(selectedDisease)
    );

    // ajinkya-change: throttle feature-state changes so year slider doesn't stutter
    if (fsRafRef.current) cancelAnimationFrame(fsRafRef.current);
    fsRafRef.current = requestAnimationFrame(() => {
      const perYear = getPerYear(
        valuesByMetricDiseaseYear,
        metric,
        selectedDisease,
        selectedYear
      );

      for (const iso of prevIsoSetRef.current) {
        map.setFeatureState(
          { source: "countries", id: iso },
          { hasValue: false, value: null }
        );
      }

      const nextSet = new Set();
      for (const [iso3, val] of Object.entries(perYear)) {
        nextSet.add(iso3);
        map.setFeatureState(
          { source: "countries", id: iso3 },
          { hasValue: true, value: val }
        );
      }
      prevIsoSetRef.current = nextSet;
    });
  }, [
    countriesGeo,
    valuesByMetricDiseaseYear,
    selectedDisease,
    selectedYear,
    metric,
    thresholds,
    paletteName,
  ]);

  return { map: mapRef.current, thresholds };
}

export function featureToCountryMeta(feature) {
  const name = feature?.properties?.[NAME_PROP] || "Unknown";
  const iso3 = (feature?.properties?.[ISO_PROP] || "").trim();
  return { name, iso3 };
}