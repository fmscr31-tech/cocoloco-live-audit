import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import "./index.css";
import "./components/individual-points.css";
import "./components/overlay/team-panel-polish.css";
import "./components/overlay/team-gender-visual-overrides.css";
import "./components/overlay/visual-motion-recovery.css";
import "./components/overlay/team-identity-final.css";
import "./components/overlay/money-gun-team-effect.css";
import "./components/overlay/girls-team-card-fuchsia.css";
import "./components/overlay/gender-battle-requested-visuals.css";
import "./components/overlay/gender-battle-live-fix.css";
import { audioManager } from "./core/audioManager";
import "./core/genderTeamRegistrationBridge";
import "./components/overlay/gender-team-join-announcement";
import "./core/chatCommandParser";
import "./core/winBridgeWatchdog";
import "./core/roundContributionManager";
import "./core/gameModeSync";
import { installGenderBattleStabilityFix } from "./components/overlay/gender-battle-stability-fix";

window.__cocoAudioManager = audioManager;
installGenderBattleStabilityFix();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);