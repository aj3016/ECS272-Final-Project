import { Routes, Route } from "react-router-dom";
import StreamEntry from "./StreamEntry";
import Globe from "./Globe";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<StreamEntry />} />
      <Route path="/globe" element={<Globe />} />
    </Routes>
  );
}