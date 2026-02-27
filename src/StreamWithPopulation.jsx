import StreamGraph from "./components/StreamGraph";
import PopulationGrowth from "./components/PopulationGrowth";

export default function StreamWithPopulation() {
  return (
    <div style={{ width: 900 }}>
      {/* TOP: disease deaths */}
      <StreamGraph />

      {/* BOTTOM: population growth */}
      <PopulationGrowth />
    </div>
  );
}