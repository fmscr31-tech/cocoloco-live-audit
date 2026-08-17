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
        background: "linear-gradient(135deg, rgba(255,192,224,.98), rgba(150,220,255,.98))",
        border: "1.5px solid #67c7ff",
        title: "#7d286b",
        shadow: "0 0 16px rgba(103,199,255,.65)"
      }
    : {
        background: "linear-gradient(135deg, rgba(20,20,30,.98), rgba(65,55,80,.98))",
        border: "1.5px solid rgba(255,215,0,.9)",
        title: "#ffd84a",
        shadow: "0 0 16px rgba(255,215,0,.55)"
      };

  return (
    <>
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
