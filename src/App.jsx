import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AuthGuard from "./components/AuthGuard";
import Layout from "./components/Layout";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import AllOrchardsPage from "./pages/AllOrchardsPage";
import WorkersPage from "./pages/WorkersPage";
import TaskDashboardPage from "./pages/TaskDashboardPage";
import MapPage from "./pages/MapPage";
import OrchardSettingsPage from "./pages/OrchardSettingsPage";

export default function App() {
  return (
    <BrowserRouter basename="/kiwiorchard-app">
      <AuthGuard>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Navigate to="/register/cas" replace />} />
            <Route path="register/:orchardId" element={<RegisterPage />} />
            <Route path="dashboard/:orchardId" element={<DashboardPage />} />
            <Route path="all-orchards" element={<AllOrchardsPage />} />
            <Route path="tasks/:orchardId" element={<TaskDashboardPage />} />
            <Route path="workers" element={<WorkersPage />} />
            <Route path="map/:orchardId" element={<MapPage />} />
            <Route path="orchard-settings/:orchardId" element={<OrchardSettingsPage />} />
          </Route>
        </Routes>
      </AuthGuard>
    </BrowserRouter>
  );
}
