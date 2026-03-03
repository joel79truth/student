import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom"; // ✅ import router
import App from "./app/App.tsx";
import "./styles/index.css";
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then(() => console.log("SW registered"))
      .catch((err) => console.log("SW error", err));
  });
}
createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);
