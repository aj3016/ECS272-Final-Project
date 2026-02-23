import { useNavigate } from "react-router-dom";
import StreamGraph from "./components/StreamGraph";

export default function StreamEntry() {
  const navigate = useNavigate();

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Stream graph area */}
      <div
        style={{
          flex: 1,
          display: "grid",
          placeItems: "center",
          paddingTop: "24px",
        }}
      >
        <StreamGraph />
      </div>

      {/* Small, static continue button */}
      <div
        style={{
          padding: "12px 16px",
          display: "flex",
          justifyContent: "flex-end",
        }}
      >
        <button
          onClick={() => navigate("/globe")}
          style={{
            padding: "6px 12px",
            fontSize: "12px",
            cursor: "pointer",
            opacity: 0.85,
          }}
        >
          Continue →
        </button>
      </div>
    </div>
  );
}