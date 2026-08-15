import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import "./index.css";
import { audioManager } from "./core/audioManager";

// Initialize the Win Limpia chat listener before the application starts.
// chatCommandParser subscribes to normalized:chat and routes the correct answer
// to gameEngine.playerWin(). Without this import the parser module is never
// instantiated, so LIVE chat answers cannot award the win point.
import "./core/chatCommandParser";

// Initialize native audio manager layer
window.__cocoAudioManager = audioManager;

ReactDOM.createRoot(
  document.getElementById("root")
)
.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
