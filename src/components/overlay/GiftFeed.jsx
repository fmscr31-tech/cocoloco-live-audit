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

  // The visible name always comes from the canonical catalog when available.
  // This prevents aliases, TikTok payload labels, or internal IDs from appearing in the slide.
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
        background: "linear-gradient(135deg, rgba(255,192,224,.18), rgba(150,220,255,.18))",
        border: "1.5px solid rgba(103,199,255,.72)",
        title: "#ffe3f5",
        shadow: "0 0 18px rgba(103,199,255,.30), 0 0 34px rgba(255,170,225,.14), inset 0 0 20px rgba(255,255,255,.05)"
      }
    : {
        background: "linear-gradient(135deg, rgba(255,255,255,.12), rgba(90,215,240,.10))",
        border: "1.5px solid rgba(103,199,255,.68)",
        title: "#e7fbff",
        shadow: "0 0 18px rgba(103,199,255,.26), 0 0 34px rgba(103,199,255,.13), inset 0 0 20px rgba(255,255,255,.05)"
      };

  return (
    <>
      <style>{`
        /* Fixed glass slide: sized for the widest canonical name and kept stable between slides. */
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
          0%, 100% {
            border-color: rgba(103,199,255,.60);
            box-shadow: 0 3px 0 rgba(20,55,75,.25), 0 7px 16px rgba(0,35,55,.18), 0 0 10px rgba(103,199,255,.15), 0 0 22px rgba(103,199,255,.07), inset 0 1px 0 rgba(255,255,255,.16);
          }
          50% {
            border-color: rgba(215,248,255,.98);
            box-shadow: 0 3px 0 rgba(20,55,75,.30), 0 8px 20px rgba(0,35,55,.24), 0 0 18px rgba(103,199,255,.38), 0 0 38px rgba(103,199,255,.18), inset 0 1px 0 rgba(255,255,255,.25);
          }
        }
        @keyframes giftSlideShimmer {
          0%, 35% { transform: translateX(-70%) rotate(8deg); opacity: 0; }
          48% { opacity: 1; }
          62%, 100% { transform: translateX(70%) rotate(8deg); opacity: 0; }
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
            width: "170px",
            minHeight: "66px",
            padding: "6px 8px",
            borderRadius: "10px",
            background: palette.background,
            border: palette.border,
            boxShadow: palette.shadow,
            color: "#fff",
            textAlign: "center",
            animation: "giftReceivedPop .32s cubic-bezier(.175,.885,.32,1.275), giftReceivedShine 2.2s ease-in-out .35s infinite"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "7px" }}>
            <GiftImage giftId={currentGift.giftName} fallbackIcon="🎁" style={{ width: "32px", height: "32px" }} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: "8px", fontWeight: 950, color: palette.title, textTransform: "uppercase", lineHeight: 1.15, whiteSpace: "normal" }}>
                {currentGift.giftName}
              </div>
              <div style={{ fontSize: "7.5px", fontWeight: 950, color: "#fff", marginTop: "3px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {currentGift.sender}
              </div>
            </div>
          </div>
          <div style={{ marginTop: "4px", fontSize: "6.8px", fontWeight: 950, color: "#fff", lineHeight: 1.15 }}>
            {currentGift.effectText}
          </div>
          <style>{`
            @keyframes giftReceivedPop{0%{opacity:0;transform:translate(-50%,-50%) scale(.72)}70%{transform:translate(-50%,-50%) scale(1.04)}100%{opacity:1;transform:translate(-50%,-50%) scale(1)}}
            @keyframes giftReceivedShine{0%,70%,100%{filter:brightness(1)}82%{filter:brightness(1.22)}}
          `}</style>
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
