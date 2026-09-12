import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AuthSessionProvider } from "./auth/useAuthSession";
import "./index.css";
import "./ui/semantic.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthSessionProvider>
      <App />
    </AuthSessionProvider>
  </React.StrictMode>
);
