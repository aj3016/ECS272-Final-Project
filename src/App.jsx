import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "./layout/AppLayout.jsx";
import StreamPage from "./pages/StreamPage.jsx";
import GlobePage from "./pages/GlobePage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Navigate to="/stream" replace />} />
        <Route path="/stream" element={<StreamPage />} />
        <Route path="/globe" element={<GlobePage />} />
        <Route path="/dashboard/:iso3" element={<DashboardPage />} />
        <Route path="*" element={<Navigate to="/stream" replace />} />
      </Route>
    </Routes>
  );
}