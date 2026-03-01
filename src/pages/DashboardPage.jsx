import React from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";

import { useEffect } from "react";
import { usePageReady } from "../state/pageReady";

export default function DashboardPage() {
  const { iso3 } = useParams();
  const [sp] = useSearchParams();

  const disease = sp.get("disease") || "";
  const year = sp.get("year") || "";

  const { markReady } = usePageReady();
  useEffect(() => { markReady(); }, [markReady]);

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ margin: 0 }}>Visualization 3: Dashboard (Template)</h2>
      <p style={{ marginTop: 8, color: "#444" }}>
        Your dashboard is not ready yet. This route is wired and ready for your teammate’s component.
      </p>

      <div style={{ marginTop: 12, padding: 12, border: "1px solid #ddd", borderRadius: 12, background: "white" }}>
        <div><b>ISO3:</b> {iso3}</div>
        <div><b>Disease:</b> {disease || "—"}</div>
        <div><b>Year:</b> {year || "—"}</div>
      </div>

      <div style={{ marginTop: 12 }}>
        <Link to="/globe">← Back to Globe</Link>
      </div>
    </div>
  );
}