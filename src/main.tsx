import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Prevent silent white-screen crashes by surfacing runtime errors in console.
// (The UI is protected by ErrorBoundary in App.tsx.)

function showFatalOverlay(title: string, detail: unknown) {
  try {
    const id = "lovable-fatal-overlay";
    const existing = document.getElementById(id);
    if (existing) existing.remove();

    const overlay = document.createElement("div");
    overlay.id = id;
    overlay.style.position = "fixed";
    overlay.style.inset = "0";
    overlay.style.zIndex = "2147483647";
    overlay.style.background = "rgba(0,0,0,0.92)";
    overlay.style.color = "#fff";
    overlay.style.fontFamily = "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace";
    overlay.style.padding = "24px";
    overlay.style.overflow = "auto";

    const pre = document.createElement("pre");
    const text =
      typeof detail === "string"
        ? detail
        : detail instanceof Error
          ? `${detail.name}: ${detail.message}\n${detail.stack ?? ""}`
          : JSON.stringify(detail, null, 2);

    pre.textContent = `${title}\n\n${text}`;
    pre.style.whiteSpace = "pre-wrap";
    pre.style.wordBreak = "break-word";
    pre.style.margin = "0";

    const hint = document.createElement("div");
    hint.textContent = "Copie este erro e envie no chat. (ESC para fechar)";
    hint.style.opacity = "0.85";
    hint.style.marginBottom = "12px";
    hint.style.fontSize = "12px";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        overlay.remove();
        window.removeEventListener("keydown", onKeyDown);
      }
    };
    window.addEventListener("keydown", onKeyDown);

    overlay.appendChild(hint);
    overlay.appendChild(pre);
    document.body.appendChild(overlay);
  } catch {
    // If DOM is not available, do nothing.
  }
}

window.addEventListener("error", (event) => {
  console.error("Global error:", event.error || event.message, event);
  showFatalOverlay("Erro global (window.error)", event.error || event.message);
});

window.addEventListener("unhandledrejection", (event) => {
  console.error("Unhandled promise rejection:", event.reason, event);
  showFatalOverlay("Promise rejeitada (unhandledrejection)", event.reason);
});

createRoot(document.getElementById("root")!).render(<App />);
