import { useEffect, useState } from "react";
import { eventBus } from "../../core/eventBus";
import { GiftImage } from "../common/GiftImage";
import { GIFT_ABILITY_MAP } from "../../config/giftAbilityMap";
import { ABILITY_REGISTRY } from "../../config/abilityRegistry";

const getGiftMeta = (item) => {
  const rawGift = item?.sourceGift || item?.giftName || item?.giftId || "Gift";
  const normalized = String(rawGift).toLowerCase();
  const mapping = GIFT_ABILITY_MAP.find(m =>
    m.giftId.toLowerCase() === normalized ||
    m.giftName.toLowerCase() === normalized ||
    (m.aliases || []).some(alias => alias.toLowerCase() === normalized)
  );
  const abilityId = item?.abilityId || mapping?.abilityId || "generic_gift";
  const registry = ABILITY_REGISTRY[abilityId];
  const giftName = mapping?.giftName || item?.sourceGift || item?.giftName || "Gift";

  let effectText = registry?.display?.name || "REGALO RECIBIDO";
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
        border: "1.5px solid rgba(103,199,255,.62)",
        title: "#ffe3f5",
        shadow: "0 0 16px rgba(103,199,255,.24), inset 0 0 18px rgba(255,255,255,.04)"
      }
    : {
        background: "linear-gradient(135deg, rgba(255,255,255,.10), rgba(70,220,190,.08))",
        border: "1.5px solid rgba(185,255,194,.48)",
        title: "#ffffff",
        shadow: "0 0 16px rgba(120,255,145,.16), inset 0 0 18px rgba(255,255,255,.035)"
      };

  return (
    <>
      <style>{`
        /* Gift information slide: fixed geometry, transparent/glass presentation. */
        .timer-feed-compact-card {
          width: 104px !important;
          height: 98px !important;
          min-height: 98px !important;
          max-height: 98px !important;
          box-sizing: border-box !important;
          border-radius: 14px !important;
          background: linear-gradient(135deg, rgba(255,255,255,.10), rgba(70,220,190,.08)) !important;
          border: 1.5px solid rgba(185,255,194,.48) !important;
          box-shadow: 0 0 16px rgba(120,255,145,.16), inset 0 0 18px rgba(255,255,255,.035) !important;
          backdrop-filter: blur(2px) !important;
          -webkit-backdrop-filter: blur(2px) !important;
          overflow: hidden !important;
        }
        .timer-feed-compact-card .compact-title {
          color: #ffffff !important;
          text-shadow: 0 2px 5px rgba(0,0,0,.78) !important;
        }
        .timer-feed-compact-card .donor-name,
        .timer-feed-compact-card .effect-badge,
        .timer-feed-compact-card .ability-badge {
          text-shadow: 0 2px 5px rgba(0,0,0,.82) !important;
        }
        .timer-feed-compact-card .effect-badge {
          background: rgba(255,255,255,.08) !important;
          border-color: rgba(185,255,194,.30) !important;
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
            width: "150px",
            minHeight: "58px",
            padding: "5px 7px",
            borderRadius: "9px",
            background: palette.background,
            border: palette.border,
            boxShadow: palette.shadow,
            color: "#fff",
            textAlign: "center",
            animation: "giftReceivedPop .32s cubic-bezier(.175,.885,.32,1.275)"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "5px" }}>
            <GiftImage giftId={currentGift.giftName} fallbackIcon="🎁" style={{ width: "28px", height: "28px" }} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: "7px", fontWeight: 950, color: palette.title, textTransform: "uppercase", lineHeight: 1.1 }}>
                {currentGift.giftName}
              </div>
              <div style={{ fontSize: "7px", fontWeight: 950, color: "#fff", marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {currentGift.sender}
              </div>
            </div>
          </div>
          <div style={{ marginTop: "3px", fontSize: "6.5px", fontWeight: 950, color: "#fff", lineHeight: 1.15 }}>
            {currentGift.effectText}
          </div>
          <style>{`@keyframes giftReceivedPop{0%{opacity:0;transform:translate(-50%,-50%) scale(.72)}70%{transform:translate(-50%,-50%) scale(1.04)}100%{opacity:1;transform:translate(-50%,-50%) scale(1)}}`}</style>
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
