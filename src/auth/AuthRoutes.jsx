import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthProvider.jsx";
import {
  accountHome,
  privilegedAccountHome,
  privilegedAccountRole,
} from "../services/authAccount.js";
import ProfileSetupGate from "./ProfileSetupGate.jsx";
import { useState } from "react";

function AccountNotice({ message }) {
  const auth = useAuth();
  const [error, setError] = useState("");
  return (
    <main className="mx-auto mt-20 max-w-lg rounded-xl border bg-white p-6">
      <p role="alert">{message}</p>
      <button className="m-2 rounded border p-2" onClick={auth.retry}>
        Retry account lookup
      </button>
      <button
        className="m-2 rounded border p-2"
        onClick={() => auth.signOut().catch((e) => setError(e.message))}
      >
        Sign out
      </button>
      {error && <p role="alert">{error}</p>}
    </main>
  );
}
export function ProtectedRoute({ role, children }) {
  const auth = useAuth();
  const location = useLocation();
  if (auth.loading)
    return (
      <p role="status" className="p-6">
        Loading your account…
      </p>
    );
  if (!auth.session)
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (auth.error) return <AccountNotice message={auth.error} />;
  const privilegedHome = privilegedAccountHome(auth.roles);
  if (privilegedHome && role !== privilegedAccountRole(auth.roles))
    return <Navigate to={privilegedHome} replace />;
  if (!auth.roles.includes(role))
    return <Navigate to={accountHome(auth.roles)} replace />;
  if (privilegedHome) return <div key={auth.user.id}>{children}</div>;
  return (
    <div key={auth.user.id}>
      <ProfileSetupGate>{children}</ProfileSetupGate>
    </div>
  );
}
export function LoginRoute({ children }) {
  const auth = useAuth();
  const location = useLocation();
  if (auth.loading)
    return (
      <p role="status" className="p-6">
        Loading your account…
      </p>
    );
  if (!auth.session) return children;
  if (auth.error) return <AccountNotice message={auth.error} />;
  const privilegedHome = privilegedAccountHome(auth.roles);
  if (privilegedHome) return <Navigate to={privilegedHome} replace />;
  const requested =
    location.pathname === "/register"
      ? "/learner-dashboard"
      : location.state?.from;
  if (requested === "/learner-dashboard" && !auth.roles.includes("learner"))
    return (
      <AccountNotice message="Your account is signed in, but Learner access is not configured. Contact support to complete your account setup." />
    );
  const allowed = auth.roles.some((r) => requested === `/${r}-dashboard`);
  return (
    <Navigate to={allowed ? requested : accountHome(auth.roles)} replace />
  );
}
