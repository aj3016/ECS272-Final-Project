import { useNavigate } from "react-router-dom";

export default function StreamEntry() {
  const navigate = useNavigate();

  return (
    <div
      style={{
        height: "100vh",
        display: "grid",
        placeItems: "center",
      }}
    >
      <button
        onClick={() => navigate("/globe")}
        style={{
          padding: "14px 28px",
          fontSize: "16px",
          cursor: "pointer",
        }}
      >
        Continue
      </button>
    </div>
  );
}