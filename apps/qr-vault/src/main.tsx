import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <main className="boot-screen">
      <h1>QR Vault</h1>
      <p>Static deeplink QR manager</p>
    </main>
  </StrictMode>
);
