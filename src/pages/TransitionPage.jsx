import React, { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import "./transition.css";

const MESSAGES = {
  "HIV/AIDS":
    "HIV/AIDS hit some regions far harder than others — explore the geographic divide below.",
  "COVID-19":
    "COVID-19 spread globally, but its impact varied dramatically across countries.",
  Ebola:
    "Ebola outbreaks were geographically concentrated but devastating where they occurred.",
  Malaria:
    "Malaria remains a persistent regional burden rather than a short-lived outbreak.",
  Measles:
    "Vaccination dramatically reduced measles deaths — but gaps remain.",
  Dengue:
    "Dengue has steadily expanded across tropical regions over the last decades.",
  Influenza:
    "Influenza outbreaks recur regularly but affect regions differently each year.",
};

export default function TransitionPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const disease = params.get("disease");
  const message =
    MESSAGES[disease] ||
    "Explore how disease impact varies across the world.";

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate(`/globe?disease=${encodeURIComponent(disease || "")}`);
    }, 2000);

    return () => clearTimeout(timer);
  }, [navigate, disease]);

  return (
    <div className="transition-screen">
      <div className="transition-text">{message}</div>
    </div>
  );
}