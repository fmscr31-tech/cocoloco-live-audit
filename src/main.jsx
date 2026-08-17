import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import "./index.css";
import "./components/individual-points.css";
import "./components/overlay/team-panel-polish.css";
import "./components/overlay/team-gender-visual-overrides.css";
import "./components/overlay/team-label-render-fix.css";
import "./components/overlay/team-identity-hard-lock.css";
import "./components/overlay/scoreboard-identity-hard-lock.css";
import "./components/overlay/visual-motion-recovery.css";
import { audioManager } from "./core/audioManager";
import "./core/chatCommandParser";
import "./core/winBridgeWatchdog";
import "./core/roundContributionManager";
import "./core/gameModeSync";

window.__cocoAudioManager = audioManager;

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
