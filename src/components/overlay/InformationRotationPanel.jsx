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
    const interval = window.setInterval(advance, SLIDE_MS);
    return () => {
      cancelled = true;
      if (fadeTimer) window.clearTimeout(fadeTimer);
      window.clearInterval(interval);
    };
  }, [slides.length]);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ index: currentIndex, updatedAt: Date.now() })); } catch (e) {}
  }, [currentIndex]);

  const slide = slides[currentIndex] || slides[0] || { title: "COCOLOCO", desc: "Participa en el LIVE.", giftId: null };
  const isGiftSlide = Boolean(slide.giftId);

  return (
    <div
      className="timer-feed-compact-card"
      style={{
        opacity: visible ? 1 : 0,
        transition: "opacity .18s ease-in-out",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        padding: "4px 6px 7px",
        boxSizing: "border-box",
        minHeight: "124px",
        width: "124px",
        overflow: "visible",
        background: "transparent",
        border: "none",
        outline: "none",
        boxShadow: "none",
        borderRadius: "0",
        isolation: "isolate"
      }}
    >
      {isGiftSlide && (
        <div
          aria-hidden="true"
          style={{
            position: "relative",
            width: "100%",
            height: "58px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1,
            pointerEvents: "none",
            flexShrink: 0,
            marginBottom: "2px",
            filter: "drop-shadow(0 3px 2px rgba(0,0,0,.55)) drop-shadow(0 -1px 1px rgba(255,255,255,.18))"
          }}
        >
          <GiftImage
            giftId={slide.giftId}
            fallbackIcon={null}
            style={{
              width: "50px",
              height: "50px",
              objectFit: "contain"
            }}
          />
        </div>
      )}

      <div
        style={{
          position: "relative",
          zIndex: 2,
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-start",
          boxSizing: "border-box",
          padding: "2px 3px 0",
          background: "transparent",
          border: "none",
          outline: "none",
          boxShadow: "none",
          borderRadius: "0",
          filter: "drop-shadow(0 2px 2px rgba(0,0,0,.42))"
        }}
      >
        <div style={{ fontSize: "0.74rem", fontWeight: 950, color: "#ffd700", textShadow: "0 1px 4px rgba(0,0,0,.98), 0 0 5px rgba(0,0,0,.8)", textTransform: "uppercase", letterSpacing: ".4px", textAlign: "center", width: "100%", lineHeight: 1.2, marginBottom: "3px" }}>
          {slide.title}
        </div>
        <div style={{ fontSize: "0.58rem", fontWeight: 850, color: "#fff", textShadow: "0 1px 4px rgba(0,0,0,.98), 0 0 5px rgba(0,0,0,.8)", textTransform: "uppercase", letterSpacing: ".2px", textAlign: "center", width: "100%", lineHeight: 1.3, wordBreak: "break-word" }}>
          {slide.desc}
        </div>
      </div>
    </div>
  );
}
