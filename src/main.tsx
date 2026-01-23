import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Prevent silent white-screen crashes by surfacing runtime errors in console.
// (The UI is protected by ErrorBoundary in App.tsx.)
window.addEventListener("error", (event) => {
  console.error("Global error:", event.error || event.message, event);
});

window.addEventListener("unhandledrejection", (event) => {
  console.error("Unhandled promise rejection:", event.reason, event);
});

createRoot(document.getElementById("root")!).render(<App />);
