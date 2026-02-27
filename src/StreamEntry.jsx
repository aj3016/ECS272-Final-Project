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
      <StreamView />

      {/* BOTTOM: population growth rate */}
      <PopulationGrowth />

      {/* Continue button */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          marginTop: 30,
        }}
      >
        <button
          onClick={() => navigate("/globe")}
          style={{
            padding: "10px 22px",
            fontSize: "14px",
            cursor: "pointer",
          }}
        >
          Continue
        </button>
      </div>
    </div>
  );
}