import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import AllOrchardsPage from "./pages/AllOrchardsPage";
import SettingsPage from "./pages/SettingsPage";

export default function App() {
  return (
    <BrowserRouter basename="/kiwiorchard-app">
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Navigate to="/all-orchards" replace />} />
          <Route path="register/:orchardId" element={<RegisterPage />} />
          <Route path="dashboard/:orchardId" element={<DashboardPage />} />
          <Route path="all-orchards" element={<AllOrchardsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
