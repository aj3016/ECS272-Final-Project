import { useEffect, useMemo, useRef } from "react";
import mapboxgl from "mapbox-gl";
import * as turf from "@turf/turf";
import { diseaseAccent } from "../utils/color";
import { computeThresholds } from "../utils/thresholds";
import { ISO_PROP, NAME_PROP } from "./useIhmeData";

/**
 * Build a fill-color expression that reads from feature-state instead of properties.
 * We store:
 *   feature-state.value (number)
 *   feature-state.hasValue (boolean)
 */
function buildFillExpressionFromState(thresholds) {
  const NO_DATA = "#e5e7eb";
  const ZERO = "#f3f4f6";

  const v = ["feature-state", "value"];
  const has = ["==", ["feature-state", "hasValue"], true];

  if (!thresholds) {
    return ["case", ["!", has], NO_DATA, ["==", v, 0], ZERO, "#2563eb"];
  }

  const [t1, t2, t3, t4] = thresholds;
  return [
    "case",
    ["!", has],
    NO_DATA,
    ["==", v, 0],
    ZERO,
    ["<", v, t1],
    "#dbeafe",
    ["<", v, t2],
    "#93c5fd",
    ["<", v, t3],
    "#60a5fa",
    ["<", v, t4],
    "#2563eb",
    "#1e40af",
  ];
}

/**
 * Apply values for (disease, year) using setFeatureState.
 * Requires the source to have promoteId set to ISO_PROP so each feature id = ISO3.
 */
function applyFeatureStates(map, valuesByDiseaseYear, disease, year) {
  const perYear = valuesByDiseaseYear?.[disease]?.[year] || {};

  // Mark everything as "no value" first is expensive if you do it every time.
  // Instead, we track previous ISO3s and clear only those.
  // We'll do that in the hook via prevIsoSetRef.
  return perYear;
}

export function useMapboxGlobe({
  mapContainerRef,
  countriesGeo,
  valuesByDiseaseYear,
  selectedDisease,
  selectedYear,
  spinEnabled,
  onHover,
  onLeave,
  onCountryClick,
}) {
  const mapRef = useRef(null);

  // refs for interaction/spin without rerender jitter
  const userInteractingRef = useRef(false);
  const spinEnabledRef = useRef(!!spinEnabled);
  const rafRef = useRef(null);

  // track which iso3s were set last time so we can clear them efficiently
  const prevIsoSetRef = useRef(new Set());

  // keep latest callbacks without re-binding map events
  const onHoverRef = useRef(onHover);
  const onLeaveRef = useRef(onLeave);
  const onCountryClickRef = useRef(onCountryClick);

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
    return computeThresholds(
      valuesByDiseaseYear,
      selectedDisease,
      selectedYear,
    );
  }, [valuesByDiseaseYear, selectedDisease, selectedYear]);

  // Init map once
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
      "bottom-right",
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

    // Make sure interactions are enabled
    map.dragPan.enable();
    map.scrollZoom.enable();
    map.doubleClickZoom.enable();
    map.touchZoomRotate.enable();

    // User interaction gating for spin
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
        map.remove();
      } catch {
        // ignore
      } finally {
        mapRef.current = null;
      }
    };
  }, [mapContainerRef]);

  // Add source/layers once data is ready
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !countriesGeo || !selectedDisease) return;

    const handleLoad = () => {
      if (map.getSource("countries")) return;

      // Use promoteId so feature.id = ISO3
      map.addSource("countries", {
        type: "geojson",
        data: countriesGeo,
        promoteId: ISO_PROP,
      });

      // Apply correct fill expression on creation (prevents initial "all blue")
      const fillExpr = buildFillExpressionFromState(thresholds);

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

      // Hover tooltip
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

      // Click drill-down
      map.on("click", "countries-fill", (e) => {
        const f = e.features?.[0];
        if (!f) return;

        userInteractingRef.current = true;

        // zoom to centroid
        try {
          const centroid = turf.centroid(f).geometry.coordinates;
          map.easeTo({ center: centroid, zoom: 3.2, duration: 900 });
        } catch (err) {
          console.warn("Could not compute centroid", err);
        }

        // briefly highlight outline
        const clickedIso = (f.properties?.[ISO_PROP] || "").trim();
        if (clickedIso) {
          map.setFilter("countries-outline", [
            "==",
            ["get", ISO_PROP],
            clickedIso,
          ]);
          window.setTimeout(
            () => map.setFilter("countries-outline", null),
            900,
          );
        }

        onCountryClickRef.current?.(f);
      });

      // Apply initial feature-states (fast)
      updateFeatureStates(
        map,
        valuesByDiseaseYear,
        selectedDisease,
        selectedYear,
      );

      // Start smooth spin loop
      startSpinLoop(map);
    };

    function startSpinLoop(mapInstance) {
      const step = () => {
        // schedule next frame first
        rafRef.current = requestAnimationFrame(step);

        if (!spinEnabledRef.current) return;
        if (userInteractingRef.current) return;

        const zoom = mapInstance.getZoom();
        if (zoom > 2.5) return;

        // small incremental rotation
        const center = mapInstance.getCenter();
        center.lng -= 0.03; // smaller per-frame step = smoother
        mapInstance.setCenter(center); // setCenter is smoother than easeTo spam
      };

      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(step);
    }

    function updateFeatureStates(mapInstance, vbd, disease, year) {
      const perYear = applyFeatureStates(mapInstance, vbd, disease, year);

      // Clear previous ISO3 states
      for (const iso of prevIsoSetRef.current) {
        mapInstance.setFeatureState(
          { source: "countries", id: iso },
          { hasValue: false, value: null },
        );
      }

      // Set new ISO3 states
      const nextSet = new Set();
      for (const [iso3, val] of Object.entries(perYear)) {
        nextSet.add(iso3);
        mapInstance.setFeatureState(
          { source: "countries", id: iso3 },
          { hasValue: true, value: val },
        );
      }

      prevIsoSetRef.current = nextSet;
    }

    if (map.loaded()) handleLoad();
    else map.once("load", handleLoad);
  }, [
    countriesGeo,
    valuesByDiseaseYear,
    selectedDisease,
    selectedYear,
    thresholds,
  ]);

  // Update style + feature-state on disease/year change (fast, no setData)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !countriesGeo || !selectedDisease) return;
    const src = map.getSource("countries");
    if (!src) return;

    // Update fill expression for new thresholds
    map.setPaintProperty(
      "countries-fill",
      "fill-color",
      buildFillExpressionFromState(thresholds),
    );

    // Update outline accent
    map.setPaintProperty(
      "countries-outline",
      "line-color",
      diseaseAccent(selectedDisease),
    );

    // Update per-country values via feature-state
    const perYear =
      valuesByDiseaseYear?.[selectedDisease]?.[selectedYear] || {};

    // clear old
    for (const iso of prevIsoSetRef.current) {
      map.setFeatureState(
        { source: "countries", id: iso },
        { hasValue: false, value: null },
      );
    }
    // set new
    const nextSet = new Set();
    for (const [iso3, val] of Object.entries(perYear)) {
      nextSet.add(iso3);
      map.setFeatureState(
        { source: "countries", id: iso3 },
        { hasValue: true, value: val },
      );
    }
    prevIsoSetRef.current = nextSet;
  }, [
    countriesGeo,
    valuesByDiseaseYear,
    selectedDisease,
    selectedYear,
    thresholds,
  ]);

  return { map: mapRef.current, thresholds };
}

export function featureToCountryMeta(feature) {
  const name = feature?.properties?.[NAME_PROP] || "Unknown";
  const iso3 = (feature?.properties?.[ISO_PROP] || "").trim();
  return { name, iso3 };
}
