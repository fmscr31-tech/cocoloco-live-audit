import { useState, useEffect, useMemo } from "react";
import { BOTTOM_ROTATION_SLIDES } from "../../config/overlayInfoConfig";
import { GiftImage } from "../common/GiftImage";

const STORAGE_KEY = "cocoloco_overlay_info_rotation_v2";
const SLIDE_MS = 4200;

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
    let fadeTimer = null;
    let interval = null;

    const advance = () => {
      setVisible(false);
      fadeTimer = window.setTimeout(() => {
        if (cancelled) return;
        setCurrentIndex(prev => {
          const next = (prev + 1) % slides.length;
          try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ index: next, updatedAt: Date.now() })); } catch (e) {}
          return next;
        });
        setVisible(true);
      }, 180);
    };

    interval = window.setInterval(advance, SLIDE_MS);
    return () => {
      cancelled = true;
      if (fadeTimer) window.clearTimeout(fadeTimer);
      if (interval) window.clearInterval(interval);
    };
  }, [slides.length]);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ index: currentIndex, updatedAt: Date.now() })); } catch (e) {}
  }, [currentIndex]);

  const slide = slides[currentIndex] || slides[0] || { title: "COCOLOCO", desc: "Participa en el LIVE.", giftId: null };
  const isGiftSlide = Boolean(slide.giftId);

  return (
    <div className="timer-feed-compact-card" style={{ opacity: visible ? 1 : 0, transition: "opacity .18s ease-in-out", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "8px 6px", boxSizing: "border-box", minHeight: "96px", width: "104px" }}>
      {isGiftSlide && (
        <div style={{ width: "32px", height: "32px", marginBottom: "3px", display: "inline-block", filter: "drop-shadow(0 2px 4px rgba(0,0,0,.6))" }}>
          <GiftImage giftId={slide.giftId} fallbackIcon={null} style={{ width: "32px", height: "32px" }} />
        </div>
      )}
      <div style={{ fontSize: "0.74rem", fontWeight: 950, color: "#ffd700", textShadow: "0 1px 4px rgba(0,0,0,.95)", textTransform: "uppercase", letterSpacing: ".4px", textAlign: "center", width: "100%", lineHeight: 1.2, marginBottom: "2px" }}>{slide.title}</div>
      <div style={{ fontSize: "0.58rem", fontWeight: 850, color: "#fff", textShadow: "0 1px 4px rgba(0,0,0,.95)", textTransform: "uppercase", letterSpacing: ".2px", textAlign: "center", width: "100%", lineHeight: 1.3, wordBreak: "break-word" }}>{slide.desc}</div>
    </div>
  );
}
