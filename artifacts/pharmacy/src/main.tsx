import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Register network-first service worker for PWA installability
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Ignore registration errors in unsupported environments
    });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
