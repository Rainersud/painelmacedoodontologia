import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Erros que escapam do React ficam só no console (para quem for investigar).
// Travamentos de tela são tratados pelo ErrorBoundary em App.tsx, que mostra
// uma mensagem amigável; erros pequenos não cobrem mais a tela da equipe.
function isAbortError(error: unknown): boolean {
  if (!error) return false;
  if (error instanceof Error) return error.name === "AbortError" || error.message.includes("aborted");
  return typeof error === "object" && "name" in error && (error as { name: string }).name === "AbortError";
}

window.addEventListener("error", (event) => {
  if (event.message?.includes?.("ResizeObserver") || isAbortError(event.error)) {
    event.preventDefault();
    return;
  }
  console.error("Erro não tratado:", event.error || event.message);
});

window.addEventListener("unhandledrejection", (event) => {
  if (isAbortError(event.reason)) {
    event.preventDefault();
    return;
  }
  console.error("Promessa rejeitada sem tratamento:", event.reason);
});

createRoot(document.getElementById("root")!).render(<App />);
