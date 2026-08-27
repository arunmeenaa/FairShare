import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import App from "./App";
import "./index.css";

import { AuthProvider } from "./context/AuthContext";
import { HouseholdProvider } from "./context/HouseholdContext";
import { NotificationProvider } from "./context/NotificationContext";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <HouseholdProvider>
          <NotificationProvider>
            <App />

            <Toaster
              position="bottom-right"
              reverseOrder={false}
              toastOptions={{
                duration: 3500,
                style: {
                  borderRadius: "12px",
                  background: "#ffffff",
                  color: "#111827",
                  boxShadow:
                    "0 10px 30px rgba(0,0,0,0.10)",
                },
                success: {
                  duration: 3000,
                },
                error: {
                  duration: 4000,
                },
              }}
            />
          </NotificationProvider>
        </HouseholdProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);