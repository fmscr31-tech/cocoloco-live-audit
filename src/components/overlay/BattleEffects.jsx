import { useEffect, useState } from "react";
import { eventBus } from "../../core/eventBus";

export function BattleEffects({ battleEffects }) {
  const [scare, setScare] = useState(null);

  useEffect(() => {
    const unsubscribe = eventBus.subscribe("ability:started", item => {
      if (item?.abilityId !== "susto_coco") return;
      const sender = item.displayName || item.sender || item.username || "Viewer";
      setScare({ sender, giftName: item.giftName || item.sourceGift || "Amped Up" });
      console.log("[BattleEffects] 😱 SUSTO RECEIVED", { sender, giftName: item.giftName, canonicalGiftId: item.canonicalGiftId });
      window.setTimeout(() => setScare(null), Number(item.duration) || 3000);
    });
    return () => unsubscribe && unsubscribe();
  }, []);

  const formatTime = secs => {
    const mins = Math.floor((secs || 0) / 60);
    const s = (secs || 0) % 60;
    return String(mins).padStart(2, "0") + ":" + String(s).padStart(2, "0");
  };

  let targetMessage = "";
  if (battleEffects?.scope === "GLOBAL") targetMessage = "TODOS";
  else if (battleEffects?.scope === "PLAYER") targetMessage = (battleEffects.affectedPlayerName || battleEffects.affectedPlayer || "JUAN").toUpperCase();
  else targetMessage = (battleEffects?.affectedTeamName || battleEffects?.affectedTeam || "EQUIPO").toUpperCase();

  const remainingSeconds = battleEffects?.remainingTime !== undefined ? battleEffects.remainingTime : 27;
  const isUrgent = remainingSeconds <= 10;

  return (
    <>
      {battleEffects?.active && (
        <div className={`battle-freeze-box ${isUrgent ? "urgent" : ""}`} data-freeze-hud="true">
          <div className="freeze-header">❄️ FREEZE ACTIVO</div>
          <div className="freeze-target">{targetMessage}</div>
          <div className="freeze-timer">⏱ {formatTime(remainingSeconds)}</div>
        </div>
      )}

      {scare && (
        <div className="coco-scare-overlay" data-scare-overlay="true">
          <div className="coco-scare-flash">😱</div>
          <div className="coco-scare-title">¡SUSTO A COCO!</div>
          <div className="coco-scare-sender">{scare.sender}</div>
          <div className="coco-scare-gift">{scare.giftName}</div>
        </div>
      )}

      <style>{`
        .coco-scare-overlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          pointer-events: none;
          animation: cocoScareFlash 0.18s steps(2) infinite alternate;
          text-shadow: 0 0 8px #000, 0 0 18px rgba(255,0,0,.9);
        }
        .coco-scare-flash { font-size: 72px; animation: cocoScareShake .12s linear infinite; }
        .coco-scare-title { font-size: 22px; font-weight: 1000; letter-spacing: 2px; }
        .coco-scare-sender { margin-top: 6px; font-size: 15px; font-weight: 900; }
        .coco-scare-gift { margin-top: 3px; font-size: 11px; opacity: .9; }
        @keyframes cocoScareFlash { from { transform: scale(1); opacity: .82; } to { transform: scale(1.035); opacity: 1; } }
        @keyframes cocoScareShake { 0% { transform: rotate(-8deg) scale(1); } 50% { transform: rotate(8deg) scale(1.12); } 100% { transform: rotate(-5deg) scale(1.05); } }
      `}</style>
    </>
  );
}
