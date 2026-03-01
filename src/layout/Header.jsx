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
            <li>Click a band to select a disease and move to the Globe.</li>
            <li>Use the mode dropdown to switch subsets/scales.</li>
          </ul>
        ),
      };
    }

    if (path.startsWith("/globe")) {
      return {
        helpTitle: "Globe help",
        helpContent: (
          <ul className="helpList">
            <li>Drag to rotate the globe; scroll to zoom.</li>
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
            <li>This page is wired for country drilldown from the Globe.</li>
            <li>Your teammate can drop the dashboard visualization here.</li>
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
          <div className="subtitle">Streamgraph → Globe → Dashboard</div>
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