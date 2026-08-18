import { useState, useEffect, useMemo } from "react";
import { BOTTOM_ROTATION_SLIDES } from "../../config/overlayInfoConfig";
import { GiftImage } from "../common/GiftImage";

const STORAGE_KEY = "cocoloco_overlay_info_rotation_v2";
const SLIDE_MS = 4200;
const PANEL_WIDTH = "116px";
const PANEL_HEIGHT = "112px";

function loadIndex(length) {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (saved && Number.isInteger(saved.index) && length > 0) return saved.index % length;
  } catch (e) {}
  return 0;
}

export function InformationRotationPanel() {
  const slides = useMemo(() => Array.isArray(BOTTOM_ROTATION_SLIDES) ? BOTTOM_ROTATION_SLIDES.filter(Boolean) : [], []);
  const [currentIndex, setCurrentIndex] = useState(() => loadIndex(slides.length));
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!slides.length) return undefined;
    let cancelled = false;
    const interval = window.setInterval(() => {
      setVisible(false);
      window.setTimeout(() => {
        if (cancelled) return;
        setCurrentIndex(prev => {
          const next = (prev + 1) % slides.length;
          try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ index: next, updatedAt: Date.now() })); } catch (e) {}
          return next;
        });
        setVisible(true);
      }, 180);
    }, SLIDE_MS);
    return () => { cancelled = true; window.clearInterval(interval); };
  }, [slides.length]);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ index: currentIndex, updatedAt: Date.now() })); } catch (e) {}
  }, [currentIndex]);

  const slide = slides[currentIndex] || slides[0] || { title: "COCOLOCO", desc: "Participa en el LIVE.", giftId: null };
  const isGiftSlide = Boolean(slide.giftId);

  return (
    <div className="timer-feed-compact-card" style={{
      opacity: visible ? 1 : 0,
      transition: "opacity .18s ease-in-out",
      position: "relative",
      top: "-8px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "flex-start",
      padding: "0 4px 4px",
      boxSizing: "border-box",
      width: PANEL_WIDTH,
      minWidth: PANEL_WIDTH,
      maxWidth: PANEL_WIDTH,
      height: PANEL_HEIGHT,
      minHeight: PANEL_HEIGHT,
      maxHeight: PANEL_HEIGHT,
      flex: "0 0 auto",
      overflow: "hidden",
      background: "transparent",
      border: "none",
      outline: "none",
      boxShadow: "none",
      borderRadius: "0",
      isolation: "isolate"
    }}>
      <div aria-hidden="true" style={{
        position: "relative", width: "100%", height: "54px", flex: "0 0 54px",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 1, pointerEvents: "none", marginBottom: "1px",
        filter: "drop-shadow(0 3px 2px rgba(0,0,0,.55)) drop-shadow(0 -1px 1px rgba(255,255,255,.18))"
      }}>
        {isGiftSlide && <GiftImage giftId={slide.giftId} fallbackIcon={null} style={{ width: "50px", height: "50px", objectFit: "contain" }} />}
      </div>

      <div style={{
        position: "relative", zIndex: 2, width: "100%", height: "50px", flex: "0 0 50px",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start",
        boxSizing: "border-box", padding: "0 2px",
        background: "transparent", border: "none", outline: "none", boxShadow: "none", borderRadius: "0",
        filter: "drop-shadow(0 2px 2px rgba(0,0,0,.42))", overflow: "hidden"
      }}>
        <div style={{ fontSize: "0.70rem", fontWeight: 950, color: "#ffd700", textShadow: "0 1px 4px rgba(0,0,0,.98), 0 0 5px rgba(0,0,0,.8)", textTransform: "uppercase", letterSpacing: ".35px", textAlign: "center", width: "100%", lineHeight: 1.15, marginBottom: "2px" }}>{slide.title}</div>
        <div style={{ fontSize: "0.55rem", fontWeight: 850, color: "#fff", textShadow: "0 1px 4px rgba(0,0,0,.98), 0 0 5px rgba(0,0,0,.8)", textTransform: "uppercase", letterSpacing: ".15px", textAlign: "center", width: "100%", lineHeight: 1.25, overflow: "hidden", wordBreak: "break-word" }}>{slide.desc}</div>
      </div>
    </div>
  );
}
