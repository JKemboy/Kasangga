import { ProtectedRoute, LoginRoute } from "../auth/AuthRoutes.jsx";
import ResetPassword from "../auth/ResetPassword.jsx";
import { createBrowserRouter, Navigate } from "react-router-dom";
import AdminDashboard from "../components/admin/AdminDashboard.jsx";
import Dashboard from "../pages/Dashboard.jsx";
import Login from "../pages/Login.jsx";
import OsasDashboard from "../components/osas/OsasDashboard.jsx";
import TutorDashboard from "../components/tutor/TutorDashboard.jsx";

const router = createBrowserRouter([
  { path: "/", element: <Navigate to="/login" replace /> },
  { path: "/reset-password", element: <ResetPassword /> },
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
