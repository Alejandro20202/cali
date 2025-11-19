import { Routes, Route, Navigate } from "react-router-dom";
import KidsInterface from "../views/KidsInterface";
import ThreeDemoView from "../views/ThreeDemoView";
import RobotSimulatorView from "../views/RobotSimulatorView";
import Map3DView from "../views/Map3DView";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<KidsInterface />} />
      <Route path="/three" element={<ThreeDemoView />} />
      <Route path="/robots" element={<RobotSimulatorView />} />
      <Route path="/mapa3d" element={<Map3DView />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
