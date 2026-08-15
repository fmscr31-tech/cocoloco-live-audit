import React from "react";
import ReactDOM from "react-dom/client";
import OverlayPreview from "./components/overlay/OverlayPreview.jsx";
import "./index.css";
import { audioManager } from "./core/audioManager";

window.__cocoAudioManager = audioManager;

ReactDOM.createRoot(
  document.getElementById("root")
).render(
  <React.StrictMode>
    <OverlayPreview />
  </React.StrictMode>
);
