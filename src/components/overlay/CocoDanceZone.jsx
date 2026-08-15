import { useState, useEffect, useRef } from "react";
import { eventBus } from "../../core/eventBus";
import { audioManager } from "../../core/audioManager";

/**
 * CocoDanceZone — Enhanced Multi-Phase Cocazo Reaction Engine
 * ANTICIPATION → IMPACT → REACTION → REMATE
 * Features variants, random phrases, combo counter, MVP target detection, audio sync, and visual hit queue.
 */
export function CocoDanceZone() {
  const [actionState, setActionState] = useState({
    coco1State: "dance",
    coco2State: "sway",
    hitEffect: false,
    variant: "normal"
  });

  const [activeHits, setActiveHits] = useState([]);
  const [comboCount, setComboCount] = useState(0);
  const lastHitTimeRef = useRef(0);

  const PHRASES = [
    "¡COCAZO! 🥥",
    "¡AUCH! 😂",
    "¡TOMA! 💥",
    "¡NOOOO!",
    "¡¿QUÉ FUE ESO?!",
    "¡ME DOLIÓ!",
    "¡JAJAJA!",
    "¡AYYYYY!",
    "¡PUM!",
    "¡OUCH! 🥥"
  ];

  const VARIANTS = ["normal", "critical", "spin", "express", "dramatic"];

  useEffect(() => {
    const interval = setInterval(() => {
      setActionState(prev => {
        if (prev.hitEffect) return prev;
        const actions = ["dance", "wink", "laugh", "jump", "cheer", "sway", "giggle"];
        return {
          ...prev,
          coco1State: actions[Math.floor(Math.random() * actions.length)],
          coco2State: actions[Math.floor(Math.random() * actions.length)]
        };
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleCocazoEvent = (giftEvent) => {
      const giftKey = String(giftEvent.giftId || giftEvent.canonicalGiftId || giftEvent.giftName || "").trim().toLowerCase();
      if (giftKey.includes("popular") || giftKey.includes("go_popular") || giftKey === "go popular" || giftKey.includes("coco") || giftKey.includes("susto")) {
        console.log("[CocoDanceZone] 🥥 Cocazo event triggered!");

        // Play audio SFX
        try {
          audioManager.playSound("/Sounds/coconut-sfx.mp3", { source: "COCAZO" });
        } catch (e) {
          console.warn("[CocoDanceZone] Audio play notice:", e);
        }

        // Combo logic (within 3 seconds)
        const now = Date.now();
        let newCombo = 1;
        if (now - lastHitTimeRef.current < 3000) {
          newCombo = comboCount + 1;
        }
        lastHitTimeRef.current = now;
        setComboCount(newCombo);

        const variant = VARIANTS[Math.floor(Math.random() * VARIANTS.length)];
        const phrase = PHRASES[Math.floor(Math.random() * PHRASES.length)];
        const username = (giftEvent.username || giftEvent.sender || "FERNANDO").toUpperCase();
        const isMvp = newCombo >= 3 || Math.random() > 0.7;
        const reactionText = isMvp ? `🏆 ¡BAJARON AL MVP: ${username}! 💥` : `${phrase} (${username})`;

        const hitId = now + Math.random();
        const newHit = {
          id: hitId,
          variant,
          text: reactionText,
          combo: newCombo,
          isCritical: variant === "critical" || newCombo >= 3
        };

        setActiveHits(prev => [...prev.slice(-3), newHit]);

        // Trigger dancing coconuts hit reaction
        setActionState({
          coco1State: "hit",
          coco2State: "dance",
          hitEffect: true,
          variant
        });

        setTimeout(() => {
          setActionState(prev => ({
            ...prev,
            coco1State: "hit",
            coco2State: "hit"
          }));
        }, 150);

        // Cleanup hit effect after 1800ms
        setTimeout(() => {
          setActionState({
            coco1State: "dance",
            coco2State: "sway",
            hitEffect: false,
            variant: "normal"
          });
        }, 1800);

        // Remove floating hit reaction after 2000ms
        setTimeout(() => {
          setActiveHits(prev => prev.filter(h => h.id !== hitId));
        }, 2000);
      }
    };

    const unsubGift = eventBus.subscribe("normalized:gift", handleCocazoEvent);
    const unsubCocazo = eventBus.subscribe("cocazo:trigger", handleCocazoEvent);

    return () => {
      unsubGift && unsubGift();
      unsubCocazo && unsubCocazo();
    };
  }, [comboCount]);

  const isHit1 = actionState.coco1State === "hit";
  const isHit2 = actionState.coco2State === "hit";

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      marginTop: "4px",
      padding: "3px 2px",
      background: "radial-gradient(circle at center, rgba(30, 110, 175, 0.85) 0%, rgba(12, 22, 40, 0.98) 100%)",
      border: "1.5px solid rgba(255, 209, 102, 0.6)",
      borderRadius: "6px",
      width: "100%",
      boxSizing: "border-box",
      boxShadow: "inset 0 1px 4px rgba(255,220,150,0.3), 0 3px 8px rgba(0,0,0,0.6)",
      overflow: "visible",
      position: "relative"
    }}>
      <div style={{
        fontSize: "6px",
        fontWeight: 900,
        color: "#ffd166",
        textTransform: "uppercase",
        letterSpacing: "0.9px",
        marginBottom: "2px",
        textShadow: "0 0 6px rgba(255,209,102,0.8)",
        display: "flex",
        alignItems: "center",
        gap: "4px"
      }}>
        <span>🥥 LOS COCAZOS 🥥</span>
        {comboCount >= 2 && (
          <span style={{ color: "#39ff88", fontSize: "5.5px", background: "rgba(57,255,136,0.2)", padding: "0.5px 3px", borderRadius: "3px", border: "1px solid #39ff88" }}>
            🔥 x{comboCount} COMBO
          </span>
        )}
      </div>

      {/* Active Floating Hit / Reaction Popups */}
      {activeHits.map(hit => (
        <div key={hit.id} style={{
          position: "absolute",
          top: "-22px",
          left: "50%",
          transform: "translateX(-50%)",
          background: hit.isCritical ? "linear-gradient(135deg, rgba(255,51,51,0.95), rgba(255,150,0,0.95))" : "linear-gradient(135deg, rgba(14,65,105,0.95), rgba(255,183,3,0.95))",
          color: "#ffffff",
          fontSize: "7px",
          fontWeight: 900,
          padding: "2px 6px",
          borderRadius: "4px",
          border: "1.5px solid #ffffff",
          zIndex: 50,
          whiteSpace: "nowrap",
          boxShadow: "0 0 15px rgba(255,215,0,0.9), 0 0 6px rgba(255,255,255,0.8)",
          animation: "cocazoPopOverlay 1.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards",
          textAlign: "center",
          pointerEvents: "none"
        }}>
          {hit.isCritical ? `💥 CRITICAL COCAZO! 💥` : hit.text}
        </div>
      ))}

      {/* Hit Flash Effect Banner */}
      {actionState.hitEffect && (
        <div style={{
          position: "absolute",
          top: "1px",
          left: 0,
          right: 0,
          background: actionState.variant === "critical" ? "rgba(255, 0, 0, 0.95)" : "rgba(255, 140, 0, 0.9)",
          color: "white",
          fontSize: "6px",
          fontWeight: 900,
          textAlign: "center",
          zIndex: 15,
          animation: "flashBanner 0.25s ease infinite alternate",
          textShadow: "0 0 4px rgba(0,0,0,0.8)"
        }}>
          {actionState.variant === "critical" ? "💥 CRITICAL BONK! 💥" : "🥥 BOOM! OUCH! 🥥"}
        </div>
      )}

      {/* Exactly 2 Dancing Coconuts Container */}
      <div style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        gap: "12px",
        height: "30px",
        position: "relative",
        width: "100%"
      }}>
        {/* Coco 1: Coco (Left) */}
        <div style={{
          width: "22px",
          height: "24px",
          background: "radial-gradient(circle at 35% 35%, #b07d62 0%, #6f4e37 70%, #4a3319 100%)",
          borderRadius: "50% 50% 45% 45%",
          position: "relative",
          boxShadow: "inset -2px -2px 5px rgba(0,0,0,0.6), 0 2px 4px rgba(0,0,0,0.4)",
          border: isHit1 ? "1.5px solid #ff3366" : "1px solid #ffd166",
          animation: isHit1 ? (actionState.variant === "spin" ? "cocoSpinHit 0.35s ease infinite" : "cocoHit1 0.25s ease infinite alternate") : actionState.coco1State === "laugh" ? "cocoLaugh1 0.4s ease infinite alternate" : "cocoDanceLeft 1.4s ease-in-out infinite",
          transformOrigin: "bottom center"
        }}>
          {/* Eyes & Smile */}
          <div style={{ position: "absolute", top: "7px", left: "5px", fontSize: "6px", lineHeight: "1" }}>
            {isHit1 ? "😭" : "👀"}
          </div>
          <div style={{ position: "absolute", top: "14px", left: "7px", fontSize: "5px", color: isHit1 ? "#ff3366" : "#ffd166" }}>
            ◡
          </div>
        </div>

        {/* Coco 2: Loco (Right) */}
        <div style={{
          width: "22px",
          height: "24px",
          background: "radial-gradient(circle at 35% 35%, #c28e6f 0%, #7d573e 70%, #523720 100%)",
          borderRadius: "50% 50% 45% 45%",
          position: "relative",
          boxShadow: "inset -2px -2px 5px rgba(0,0,0,0.6), 0 2px 4px rgba(0,0,0,0.4)",
          border: isHit2 ? "1.5px solid #ff3366" : "1.5px solid #48cae4",
          animation: isHit2 ? (actionState.variant === "spin" ? "cocoSpinHit 0.35s ease infinite" : "cocoHit2 0.25s ease infinite alternate") : actionState.coco2State === "jump" ? "cocoJump2 0.5s ease infinite alternate" : "cocoDanceRight 1.2s ease-in-out infinite",
          animationDelay: "0.2s",
          transformOrigin: "bottom center"
        }}>
          {/* Eyes & Smile */}
          <div style={{ position: "absolute", top: "7px", left: "5px", fontSize: "6px", lineHeight: "1" }}>
            {isHit2 ? "😭" : "👀"}
          </div>
          <div style={{ position: "absolute", top: "14px", left: "7px", fontSize: "5px", color: isHit2 ? "#ff3366" : "#48cae4" }}>
            ◡
          </div>
        </div>
      </div>

      {/* Embedded Keyframe Animations */}
      <style>{`
        @keyframes cocoDanceLeft {
          0%, 100% { transform: translateY(0) rotate(-7deg) scale(1); }
          50% { transform: translateY(-4px) rotate(5deg) scale(1.06); }
        }
        @keyframes cocoDanceRight {
          0%, 100% { transform: translateY(-2px) rotate(6deg) scale(1); }
          50% { transform: translateY(-5px) rotate(-6deg) scale(1.06); }
        }
        @keyframes cocoJump2 {
          0% { transform: translateY(0) scale(1); }
          100% { transform: translateY(-7px) scale(1.12); }
        }
        @keyframes cocoLaugh1 {
          0% { transform: rotate(-8deg) scale(1.08); }
          100% { transform: rotate(8deg) scale(1.12); }
        }
        @keyframes cocoHit1 {
          0% { transform: translateY(4px) rotate(20deg) scale(0.9); filter: drop-shadow(0 0 6px #ff3366); }
          100% { transform: translateY(-3px) rotate(-20deg) scale(1.1); filter: drop-shadow(0 0 10px #ffd166); }
        }
        @keyframes cocoHit2 {
          0% { transform: translateY(3px) rotate(-22deg) scale(0.9); filter: drop-shadow(0 0 6px #ff3366); }
          100% { transform: translateY(-4px) rotate(22deg) scale(1.1); filter: drop-shadow(0 0 10px #48cae4); }
        }
        @keyframes cocoSpinHit {
          0% { transform: rotate(0deg) scale(0.95); }
          100% { transform: rotate(360deg) scale(1.05); }
        }
        @keyframes flashBanner {
          0% { opacity: 0.6; transform: scale(0.98); }
          100% { opacity: 1; transform: scale(1.02); }
        }
        @keyframes starSpin {
          0% { transform: rotate(0deg) scale(0.8); }
          100% { transform: rotate(360deg) scale(1.2); }
        }
        @keyframes cocazoPopOverlay {
          0% { transform: translateX(-50%) scale(0.4) translateY(10px); opacity: 0; }
          30% { transform: translateX(-50%) scale(1.15) translateY(-4px); opacity: 1; }
          70% { transform: translateX(-50%) scale(1) translateY(0); opacity: 1; }
          100% { transform: translateX(-50%) scale(0.9) translateY(-15px); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
