import { createBrowserRouter, Navigate, useLocation } from "react-router-dom";
import AdminDashboard from "../components/admin/AdminDashboard.jsx";
import Dashboard from "../pages/Dashboard.jsx";
import Login from "../pages/Login.jsx";
import OsasDashboard from "../components/osas/OsasDashboard.jsx";
import TutorDashboard from "../components/tutor/TutorDashboard.jsx";

import Register from "../pages/Register.jsx";
import { LoginRoute, ProtectedRoute } from "../auth/AuthRoutes.jsx";

function RootRedirect() {
  const location = useLocation();
  const payment = new URLSearchParams(location.search).get("payment");
  return (
    <Navigate
      to={(payment ? "/learner-dashboard" : "/login") + location.search}
      replace
    />
  );
}

const router = createBrowserRouter([
  { path: "/", element: <RootRedirect /> },
  {
    path: "/register",
    element: (
      <LoginRoute>
        <Register />
      </LoginRoute>
    ),
  },
  {
    path: "/login",
    element: (
      <LoginRoute>
        <Login />
      </LoginRoute>
    ),
  },
  {
    path: "/learner-dashboard",
    element: (
      <ProtectedRoute role="learner">
        <Dashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: "/tutor-dashboard",
    element: (
      <ProtectedRoute role="tutor">
        <TutorDashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: "/admin-dashboard",
    element: (
      <ProtectedRoute role="admin">
        <AdminDashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: "/osas-dashboard",
    element: (
      <ProtectedRoute role="osas">
        <OsasDashboard />
      </ProtectedRoute>
    ),
  },
  { path: "*", element: <Navigate to="/login" replace /> },
]);

export default router;
