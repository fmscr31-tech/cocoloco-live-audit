import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import "./index.css";
import "./components/individual-points.css";
import { audioManager } from "./core/audioManager";

// Initialize the Win Limpia chat listener before the application starts.
import "./core/chatCommandParser";
import "./core/winBridgeWatchdog";

// Initialize native audio manager layer
window.__cocoAudioManager = audioManager;

ReactDOM.createRoot(
  document.getElementById("root")
).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
