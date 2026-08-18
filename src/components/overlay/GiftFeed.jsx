import { useEffect, useState } from "react";
import { eventBus } from "../../core/eventBus";
import { GiftImage } from "../common/GiftImage";
import { GIFT_ABILITY_MAP } from "../../config/giftAbilityMap";
import { ABILITY_REGISTRY } from "../../config/abilityRegistry";
import { resolveCanonicalGiftId } from "../../config/canonicalGifts";

const getGiftMeta = (item) => {
  const rawGift = item?.sourceGift || item?.giftName || item?.giftId || "Gift";
  const normalized = String(rawGift).toLowerCase();
  const canonical = resolveCanonicalGiftId({
    giftId: item?.giftId,
    giftName: item?.giftName || item?.sourceGift,
    rawInput: rawGift
  });
  const mapping = GIFT_ABILITY_MAP.find(m =>
    m.giftId.toLowerCase() === normalized ||
    m.giftName.toLowerCase() === normalized ||
    (m.aliases || []).some(alias => alias.toLowerCase() === normalized)
  );
  const abilityId = item?.abilityId || canonical?.abilityId || mapping?.abilityId || "generic_gift";
  const registry = ABILITY_REGISTRY[abilityId];

  const giftName = canonical?.display?.name || canonical?.displayName?.replace(/\s+[\p{Extended_Pictographic}].*$/u, "") || mapping?.giftName || item?.sourceGift || item?.giftName || "Gift";

  let effectText = registry?.display?.name || "RECIBIDO";
  if (abilityId === "silent_challenge") effectText = "EL MUDO • +1 PUNTO";
  else if (abilityId === "creative_challenge") effectText = "RETO CREATIVO";
  else if (abilityId === "ultimate_galaxy") effectText = "GALAXY • +1 RONDA";
  else if (abilityId === "epic_impact") effectText = "EPIC IMPACT";
  else if (abilityId === "freeze") effectText = "FREEZE • CASTIGO";
  else if (abilityId === "clue_hint") effectText = "PISTA / CLUE";
  else if (abilityId === "cocazo") effectText = "COCAZO • ANIMACIÓN";
  else if (abilityId === "susto_coco") effectText = "SUSTO A COCO";

  return {
    giftName,
    abilityId,
    effectText,
    sender: item?.sender || item?.username || "ESPECTADOR",
    executionId: item?.executionId || item?.eventId || `${Date.now()}-${Math.random()}`
  };
};

export function GiftFeed() {
  const [giftQueue, setGiftQueue] = useState([]);
  const [currentGift, setCurrentGift] = useState(null);
  const [cocazo, setCocazo] = useState(null);

  useEffect(() => {
    const seen = new Map();

    const unsubStarted = eventBus.subscribe("ability:started", item => {
      const meta = getGiftMeta(item);
      const now = Date.now();
      const dedupeKey = String(item?.executionId || item?.eventId || `${meta.sender}:${meta.giftName}`).toLowerCase();
      if (now - (seen.get(dedupeKey) || 0) < 1800) return;
      seen.set(dedupeKey, now);
      for (const [key, timestamp] of seen) {
        if (now - timestamp > 6000) seen.delete(key);
      }

      setGiftQueue(prev => [...prev, meta]);

      if (meta.abilityId === "cocazo") {
        setCocazo({ username: meta.sender, executionId: meta.executionId });
      }
    });

    const unsubFinished = eventBus.subscribe("ability:finished", item => {
      if (item?.abilityId === "cocazo") setCocazo(null);
    });

    return () => {
      unsubStarted?.();
      unsubFinished?.();
    };
  }, []);

  useEffect(() => {
    if (currentGift || giftQueue.length === 0) return undefined;
    const [next, ...rest] = giftQueue;
    setGiftQueue(rest);
    setCurrentGift(next);
    return undefined;
  }, [currentGift, giftQueue]);

  useEffect(() => {
    if (!currentGift) return undefined;
    const timer = window.setTimeout(() => setCurrentGift(null), 4000);
    return () => window.clearTimeout(timer);
  }, [currentGift]);

  const isIceCream = currentGift?.abilityId === "clue_hint";
  const palette = isIceCream
    ? {
        background: "linear-gradient(135deg, rgba(255,192,224,.20), rgba(150,220,255,.20))",
        border: "1.5px solid rgba(103,199,255,.78)",
        title: "#ffe3f5",
        shadow: "0 0 22px rgba(103,199,255,.34), 0 0 42px rgba(255,170,225,.16), inset 0 0 24px rgba(255,255,255,.07)"
      }
    : {
        background: "linear-gradient(135deg, rgba(8,24,38,.72), rgba(20,90,115,.48))",
        border: "1.5px solid rgba(103,199,255,.76)",
        title: "#e7fbff",
        shadow: "0 0 22px rgba(103,199,255,.30), 0 0 42px rgba(103,199,255,.16), inset 0 0 24px rgba(255,255,255,.07)"
      };

  return (
    <>
      <style>{`
        .timer-feed-compact-card {
          width: 148px !important;
          height: 120px !important;
          min-height: 120px !important;
          max-height: 120px !important;
          box-sizing: border-box !important;
          border-radius: 15px !important;
          background: linear-gradient(135deg, rgba(255,255,255,.12), rgba(90,215,240,.11)) !important;
          border: 1.5px solid rgba(103,199,255,.76) !important;
          box-shadow: 0 3px 0 rgba(20,55,75,.28), 0 7px 18px rgba(0,35,55,.22), 0 0 15px rgba(103,199,255,.22), 0 0 32px rgba(103,199,255,.12), inset 0 1px 0 rgba(255,255,255,.20), inset 0 -8px 18px rgba(0,70,100,.08) !important;
          backdrop-filter: blur(3px) !important;
          -webkit-backdrop-filter: blur(3px) !important;
          overflow: hidden !important;
          animation: giftSlideGlow 2.4s ease-in-out infinite !important;
        }
        .timer-feed-compact-card::after {
          content: "";
          position: absolute;
          inset: -40%;
          background: linear-gradient(115deg, transparent 40%, rgba(255,255,255,.24) 48%, transparent 56%);
          transform: translateX(-70%) rotate(8deg);
          animation: giftSlideShimmer 3.8s ease-in-out infinite;
          pointer-events: none;
        }
        .timer-feed-compact-card .compact-title {
          color: #dff9ff !important;
          text-shadow: 0 2px 5px rgba(0,0,0,.78), 0 0 7px rgba(103,199,255,.48) !important;
        }
        .timer-feed-compact-card .donor-name,
        .timer-feed-compact-card .effect-badge,
        .timer-feed-compact-card .ability-badge {
          text-shadow: 0 2px 5px rgba(0,0,0,.82) !important;
        }
        .timer-feed-compact-card .effect-badge {
          background: rgba(103,199,255,.10) !important;
          border-color: rgba(103,199,255,.34) !important;
        }
        @keyframes giftSlideGlow {
          0%, 100% { border-color: rgba(103,199,255,.60); box-shadow: 0 3px 0 rgba(20,55,75,.25), 0 7px 16px rgba(0,35,55,.18), 0 0 10px rgba(103,199,255,.15), 0 0 22px rgba(103,199,255,.07), inset 0 1px 0 rgba(255,255,255,.16); }
          50% { border-color: rgba(215,248,255,.98); box-shadow: 0 3px 0 rgba(20,55,75,.30), 0 8px 20px rgba(0,35,55,.24), 0 0 18px rgba(103,199,255,.38), 0 0 38px rgba(103,199,255,.18), inset 0 1px 0 rgba(255,255,255,.25); }
        }
        @keyframes giftSlideShimmer {
          0%, 35% { transform: translateX(-70%) rotate(8deg); opacity: 0; }
          48% { opacity: 1; }
          62%, 100% { transform: translateX(70%) rotate(8deg); opacity: 0; }
        }
        @keyframes giftBackgroundPulse {
          0%, 100% { transform: scale(.96) rotate(-2deg); opacity: .34; filter: saturate(1) brightness(.78) drop-shadow(0 0 8px rgba(103,199,255,.15)); }
          50% { transform: scale(1.08) rotate(2deg); opacity: .62; filter: saturate(1.35) brightness(1.05) drop-shadow(0 0 22px rgba(103,199,255,.40)); }
        }
        @keyframes giftBackgroundFloat {
          0%, 100% { transform: translate3d(0, 0, 0) scale(.98); }
          50% { transform: translate3d(0, -3px, 0) scale(1.02); }
        }
        @keyframes giftTextReveal {
          0% { opacity: 0; transform: translateY(5px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes giftReceivedPop {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(.70); }
          65% { transform: translate(-50%, -50%) scale(1.055); }
          100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
        @keyframes giftReceivedShine {
          0%, 70%, 100% { filter: brightness(1); }
          82% { filter: brightness(1.20); }
        }
        @media (prefers-reduced-motion: reduce) {
          .timer-feed-compact-card, .gift-bg-art, .gift-bg-art img, .gift-copy { animation: none !important; }
        }
      `}</style>

      {currentGift && (
        <div
          className="gift-received-popup"
          aria-live="polite"
          style={{
            position: "absolute",
            left: "50%",
            top: "38%",
            transform: "translate(-50%, -50%)",
            zIndex: 10000,
            width: "190px",
            height: "112px",
            minHeight: "112px",
            boxSizing: "border-box",
            padding: "10px",
            borderRadius: "14px",
            background: palette.background,
            border: palette.border,
            boxShadow: palette.shadow,
            color: "#fff",
            textAlign: "center",
            overflow: "hidden",
            isolation: "isolate",
            animation: "giftReceivedPop .38s cubic-bezier(.175,.885,.32,1.275), giftReceivedShine 2.2s ease-in-out .35s infinite"
          }}
        >
          <div
            className="gift-bg-art"
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: "-12px",
              zIndex: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none",
              animation: "giftBackgroundFloat 2.8s ease-in-out infinite"
            }}
          >
            <GiftImage
              giftId={currentGift.giftName}
              giftName={currentGift.giftName}
              fallbackIcon={null}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                opacity: .48,
                filter: "drop-shadow(0 0 12px rgba(103,199,255,.28))",
                animation: "giftBackgroundPulse 2.1s ease-in-out infinite"
              }}
            />
          </div>

          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 1,
              background: "linear-gradient(180deg, rgba(3,15,25,.28) 0%, rgba(3,15,25,.52) 45%, rgba(3,15,25,.82) 100%), radial-gradient(circle at 50% 42%, transparent 0%, rgba(3,15,25,.42) 82%)",
              pointerEvents: "none"
            }}
          />

          <div
            className="gift-copy"
            style={{
              position: "relative",
              zIndex: 2,
              height: "100%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              alignItems: "center",
              animation: "giftTextReveal .35s ease-out .08s both"
            }}
          >
            <div
              style={{
                fontSize: "10px",
                fontWeight: 950,
                color: palette.title,
                textTransform: "uppercase",
                lineHeight: 1.15,
                maxWidth: "100%",
                padding: "2px 7px",
                borderRadius: "5px",
                background: "rgba(0,0,0,.48)",
                border: "1px solid rgba(255,255,255,.18)",
                textShadow: "0 2px 6px rgba(0,0,0,.95), 0 0 8px rgba(103,199,255,.55)"
              }}
            >
              {currentGift.giftName}
            </div>

            <div style={{ marginTop: "2px" }}>
              <div
                style={{
                  fontSize: "8px",
                  fontWeight: 950,
                  color: "#fff",
                  textTransform: "uppercase",
                  textShadow: "0 2px 6px rgba(0,0,0,.98)",
                  maxWidth: "170px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap"
                }}
              >
                {currentGift.sender}
              </div>
              <div
                style={{
                  marginTop: "4px",
                  padding: "4px 8px",
                  borderRadius: "5px",
                  background: "rgba(0,0,0,.66)",
                  border: "1px solid rgba(255,255,255,.20)",
                  fontSize: "7.5px",
                  fontWeight: 950,
                  color: "#fff",
                  lineHeight: 1.2,
                  textShadow: "0 2px 5px rgba(0,0,0,.95)",
                  boxShadow: "0 3px 10px rgba(0,0,0,.28)"
                }}
              >
                {currentGift.effectText}
              </div>
            </div>
          </div>
        </div>
      )}

      {cocazo && (
        <div className="cocazo-live-effect" key={cocazo.executionId} aria-label="Cocazo activado">
          <div className="cocazo-impact-ring" />
          <div className="cocazo-particles">🥥</div>
          <div className="cocazo-title">💥 COCAZO 💥</div>
          <div className="cocazo-sender">{cocazo.username}</div>
        </div>
      )}
    </>
  );
}
