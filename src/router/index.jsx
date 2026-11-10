import { createBrowserRouter, Navigate, useLocation } from "react-router-dom";
import LcoDashboard from "../components/lco/LcoDashboard.jsx";
import Dashboard from "../pages/Dashboard.jsx";
import Login from "../pages/Login.jsx";
import OsweDashboard from "../components/oswe/OsweDashboard.jsx";
import TutorDashboard from "../components/tutor/TutorDashboard.jsx";

import Register from "../pages/Register.jsx";
import TermsConditions from "../pages/TermsConditions.jsx";
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
  { path: "/terms", element: <TermsConditions /> },
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
    path: "/lco-dashboard",
    element: (
      <ProtectedRoute role="lco">
        <LcoDashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: "/oswe-dashboard",
    element: (
      <ProtectedRoute role="oswe">
        <OsweDashboard />
      </ProtectedRoute>
    ),
  },
  { path: "*", element: <Navigate to="/login" replace /> },
]);

export default router;
