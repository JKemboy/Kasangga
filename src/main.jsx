import "./resetDemoData.js";
import InteractionProvider from "./components/shared/InteractionProvider.jsx";
import LogoutProvider from "./components/shared/LogoutProvider.jsx";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import router from "./router/index.jsx";
import "./index.css";
import "./components/shared/modal-density.css";
import "./components/admin/modal-density.css";
import "./components/osas/modal-density.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <InteractionProvider><LogoutProvider><RouterProvider router={router} /></LogoutProvider></InteractionProvider>
  </StrictMode>,
);
