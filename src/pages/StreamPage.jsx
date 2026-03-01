import React from "react";
import { useNavigate } from "react-router-dom";
import StreamView from "../components/StreamView";
import PopulationGrowth from "../components/PopulationGrowth";
import { setDiseaseFromStreamgraph } from "../state/vizStore";
import { usePageReady } from "../state/pageReady";
import { useEffect } from "react";
// import StreamGraphEChartsFromCsv from "../components/StreamGraphEChartsFromCsv";
// import StreamGraphNivoFromCsv from "../components/StreamGraphNivoFromCsv";

export default function StreamPage() {
  const navigate = useNavigate();
  const { markReady } = usePageReady();
  useEffect(() => { markReady(); }, [markReady]);

  return (
    <div
      style={{
        width: 900,
        margin: "0 auto",
        paddingTop: 20,
      }}
    >
      <StreamView
        onDiseaseSelect={(d) => {
          setDiseaseFromStreamgraph(d);
          navigate(`/globe?disease=${encodeURIComponent(d)}`);
        }}
      />

      <PopulationGrowth />
    </div>
  );
}