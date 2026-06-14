import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Unregister old service workers to ensure users get the latest version
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (let registration of registrations) {
      registration.unregister();
    }
  });
}

createRoot(document.getElementById("root")!).render(<App />);
