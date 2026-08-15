import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import "./index.css";
import { audioManager } from "./core/audioManager";

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
