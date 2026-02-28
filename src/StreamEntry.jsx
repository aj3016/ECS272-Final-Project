import { useNavigate } from "react-router-dom";
import StreamGraph from "./components/StreamGraph";
import PopulationGrowth from "./components/PopulationGrowth";
import StreamView from "./components/StreamView";

export default function StreamEntry() {
  const navigate = useNavigate();

  return (
    <div
      style={{
        width: 900,
        margin: "0 auto",
        paddingTop: 20,
      }}
    >
      {/* TOP: disease stream graph */}
      <StreamView onDiseaseSelect={(d) => navigate(`/globe?disease=${encodeURIComponent(d)}`)} />

      {/* BOTTOM: population growth rate */}
      <PopulationGrowth />

    </div>
  );
}