import AuthProvider from "./auth/AuthProvider.jsx";
import InteractionProvider from "./components/shared/InteractionProvider.jsx";
import LogoutProvider from "./components/shared/LogoutProvider.jsx";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { connectBookingApi } from "./services/portalApi.js";
import router from "./router/index.jsx";
import "./index.css";
import "./components/shared/modal-density.css";
import "./components/lco/modal-density.css";
import "./components/oswe/modal-density.css";
import "./components/shared/portal-badges.css";

connectBookingApi();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider>
      <InteractionProvider>
        <LogoutProvider>
          <RouterProvider router={router} />
        </LogoutProvider>
      </InteractionProvider>
    </AuthProvider>
  </StrictMode>,
);
import "./components/shared/portal-controls.css";
