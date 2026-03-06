import React, { useEffect, useMemo, useRef, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Header from "./Header.jsx";
import Stepper from "./Stepper.jsx";
import TransitionCurtain from "./TransitionCurtain.jsx";
import { PageReadyProvider } from "../state/pageReady";
// import AmbientVanta from "../components/AmbientVanta";


function routeRank(pathname) {
  if (pathname.startsWith("/stream")) return 0;
  if (pathname.startsWith("/globe")) return 1;
  if (pathname.startsWith("/dashboard")) return 2;
  return 0;
}

export default function AppLayout() {
  const loc = useLocation();

  const stepHint = useMemo(() => {
    if (loc.pathname.startsWith("/stream"))
      return "Click a band to choose a disease → Globe";
    if (loc.pathname.startsWith("/globe"))
      return "Drag to rotate • Hover for values • Click a country → Details";
    if (loc.pathname.startsWith("/dashboard"))
      return "Country-level drilldown dashboard (coming soon)";
    return "";
  }, [loc.pathname]);

  const vantaEnabled = loc.pathname !== "/globe";

  // directional logic
  const prevRankRef = useRef(routeRank(loc.pathname));
  const dirRef = useRef(1);
  const currRank = routeRank(loc.pathname);

  if (currRank !== prevRankRef.current) {
    dirRef.current = currRank > prevRankRef.current ? 1 : -1;
  }

  // curtain control
  const [curtainOpen, setCurtainOpen] = useState(false);
  const readyRef = useRef(false);
  const timeoutRef = useRef(null);

  // called by pages when their main viz is ready
  const markReady = () => {
    if (readyRef.current) return;
    readyRef.current = true;

    // small delay makes it feel intentional, avoids blink
    window.setTimeout(() => setCurtainOpen(false), 120);
  };

  // on route change, open curtain and wait for ready
  useEffect(() => {
    readyRef.current = false;
    setCurtainOpen(true);

    // fallback: never get stuck if a page forgets to markReady
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => {
      setCurtainOpen(false);
    }, 1200);

    // commit prev rank after nav begins (direction stays stable)
    prevRankRef.current = currRank;

    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    };
  }, [loc.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <PageReadyProvider value={{ markReady }}>
      <div className="appShell">
        {/* <div className="ambientDisease" aria-hidden="true" /> */}
        {/* <AmbientVanta enabled={vantaEnabled} /> */}
        <Header />
        <div style={{ padding: "12px 12px 0 12px" }}>
          <Stepper hint={stepHint} />
        </div>

        <main className="appMain" style={{ position: "relative" }}>
          {/* Route content renders normally */}
          <Outlet />

          {/* Curtain overlays while new view loads */}
          <TransitionCurtain show={curtainOpen} dir={dirRef.current} />
        </main>
      </div>
    </PageReadyProvider>
  );
}