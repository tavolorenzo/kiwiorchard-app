import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout          from "./components/Layout";
import RegisterPage    from "./pages/RegisterPage";
import DashboardPage   from "./pages/DashboardPage";
import AllOrchardsPage from "./pages/AllOrchardsPage";

export default function App() {
  return (
    <BrowserRouter basename="/kiwiorchard-app">
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Navigate to="/register/cas" replace />} />
          <Route path="register/:orchardId"  element={<RegisterPage />} />
          <Route path="dashboard/:orchardId" element={<DashboardPage />} />
          <Route path="all-orchards"         element={<AllOrchardsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
