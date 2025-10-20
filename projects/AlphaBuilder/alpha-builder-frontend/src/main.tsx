import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import "./index.css";
import "./styles/spring-bouquet.css";
import router from "./routes/router";
import { EmailAuthProvider } from "@/hooks/useEmailAuth";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <EmailAuthProvider>
      <RouterProvider router={router} />
    </EmailAuthProvider>
  </StrictMode>
);
