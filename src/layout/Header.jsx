import React, { useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import HelpModal from "./HelpModal.jsx";

export default function Header() {
  const [helpOpen, setHelpOpen] = useState(false);
  const loc = useLocation();

  const { helpTitle, helpContent } = useMemo(() => {
    const path = loc.pathname;

    if (path.startsWith("/stream")) {
      return {
        helpTitle: "Streamgraph help",
        helpContent: (
          <ul className="helpList">
            <li>Hover to see total deaths for a disease band.</li>
            <li>Click a band to select a disease and move to the Geographic View.</li>
            <li>Use the mode dropdown to switch subsets/scales.</li>
          </ul>
        ),
      };
    }

    if (path.startsWith("/geo")) {
      return {
        helpTitle: "Geographic View help",
        helpContent: (
          <ul className="helpList">
            <li>Drag to rotate or pan the map; scroll to zoom.</li>
            <li>Hover a country to see the value for the selected disease/year.</li>
            <li>Click a country to open the detail panel (sparkline).</li>
            <li>Use Play to animate years; Metric/Scale/Shades improve readability.</li>
          </ul>
        ),
      };
    }

    if (path.startsWith("/dashboard")) {
      return {
        helpTitle: "Dashboard help",
        helpContent: (
          <ul className="helpList">
            <li>Use the year slider to focus a specific time point across all charts.</li>
            <li>Hover inside any chart to synchronize year comparison across metrics.</li>
            <li>Switch disease and burden metric to compare disruption and recovery.</li>
          </ul>
        ),
      };
    }

    return {
      helpTitle: "Help",
      helpContent: <div style={{ fontSize: 13, color: "#333" }}>No help available.</div>,
    };
  }, [loc.pathname]);

  return (
    <>
      <header className="appHeader">
        <div className="headerLeft">
          <div className="brand">ECS272 • Global Disease Story</div>
          <div className="subtitle">Streamgraph → Geographic View → Dashboard</div>
        </div>

        <button
          type="button"
          className="helpBtn"
          onClick={() => setHelpOpen(true)}
          title="How to use this page"
        >
          Help
        </button>
      </header>

      <HelpModal open={helpOpen} title={helpTitle} onClose={() => setHelpOpen(false)}>
        {helpContent}
      </HelpModal>
    </>
  );
}
