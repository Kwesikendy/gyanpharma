import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "./contexts/AuthContext";
import "virtual:pwa-register"; // Ensure the service worker gets registered

createRoot(document.getElementById("root")!).render(<App />);
