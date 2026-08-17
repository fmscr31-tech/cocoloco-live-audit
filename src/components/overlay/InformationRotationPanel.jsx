import { useState, useEffect } from "react";
import { BOTTOM_ROTATION_SLIDES } from "../../config/overlayInfoConfig";
import { GiftImage } from "../common/GiftImage";

export function InformationRotationPanel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % BOTTOM_ROTATION_SLIDES.length);
        setFade(true);
      }, 200);
    }, 4200);

    return () => clearInterval(interval);
  }, []);

  const slide = BOTTOM_ROTATION_SLIDES[currentIndex] || BOTTOM_ROTATION_SLIDES[0];
  const isGiftSlide = Boolean(slide?.giftId);

  return (
    <div
      className="timer-feed-compact-card"
      style={{
        opacity: fade ? 1 : 0,
        transition: "opacity 0.2s ease-in-out",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "8px 6px",
        boxSizing: "border-box",
        minHeight: "96px",
        width: "104px"
      }}
    >
      {isGiftSlide && (
        <div style={{
          width: "32px",
          height: "32px",
          marginBottom: "3px",
          display: "inline-block",
          filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.6))"
        }}>
          <GiftImage
            giftId={slide.giftId}
            fallbackIcon={null}
            style={{ width: "32px", height: "32px" }}
          />
        </div>
      )}

      <div style={{
        fontSize: "0.74rem",
        fontWeight: 950,
        color: "#ffd700",
        textShadow: "0 1px 4px rgba(0,0,0,0.95), 0 0 5px rgba(0,0,0,0.65)",
        textTransform: "uppercase",
        letterSpacing: "0.4px",
        textAlign: "center",
        width: "100%",
        lineHeight: "1.2",
        marginBottom: "2px"
      }}>
        {slide.title}
      </div>

      <div style={{
        fontSize: "0.58rem",
        fontWeight: 850,
        color: "#ffffff",
        textShadow: "0 1px 4px rgba(0,0,0,0.95), 0 0 4px rgba(0,0,0,0.7)",
        textTransform: "uppercase",
        letterSpacing: "0.2px",
        textAlign: "center",
        width: "100%",
        lineHeight: "1.3",
        wordBreak: "break-word"
      }}>
        {slide.desc}
      </div>
    </div>
  );
}
