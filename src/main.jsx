import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import "./index.css";
import "./components/individual-points.css";
import { audioManager } from "./core/audioManager";

// Initialize the live event listeners before the application starts.
import "./core/chatCommandParser";
import "./core/winBridgeWatchdog";
import "./core/roundContributionManager";

window.__cocoAudioManager = audioManager;

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
