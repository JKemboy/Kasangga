import { createBrowserRouter, Navigate } from "react-router-dom";
import AdminDashboard from "../components/admin/AdminDashboard.jsx";
import Dashboard from "../pages/Dashboard.jsx";
import Login from "../pages/Login.jsx";
import OsasDashboard from "../components/osas/OsasDashboard.jsx";
import TutorDashboard from "../components/tutor/TutorDashboard.jsx";

const router = createBrowserRouter([
  { path: "/", element: <Navigate to="/login" replace /> },
  { path: "/login", element: <Login /> },
  { path: "/learner-dashboard", element: <Dashboard /> },
  { path: "/tutor-dashboard", element: <TutorDashboard /> },
  { path: "/admin-dashboard", element: <AdminDashboard /> },
  { path: "/osas-dashboard", element: <OsasDashboard /> },
  { path: "*", element: <Navigate to="/login" replace /> },
]);

export default router;
