import React from "react";
import { NavLink } from "react-router-dom";

export default function Stepper({ dashboardTo = "/dashboard", hint = "" }) {
  const steps = [
    { to: "/stream", label: "1 Streamgraph" },
    { to: "/geo", label: "2 Geographic View" },
    { to: dashboardTo, label: "3 Dashboard" },
  ];

  return (
    <div className="stepperBar">
      <div className="stepperLeft">
        {steps.map((s) => (
          <NavLink
            key={s.to}
            to={s.to}
            className={({ isActive }) =>
              isActive ? "stepChip stepChipActive" : "stepChip"
            }
          >
            {s.label}
          </NavLink>
        ))}
      </div>

      <div className="stepperHint">{hint}</div>
    </div>
  );
}