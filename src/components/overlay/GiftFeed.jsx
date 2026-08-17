import { useEffect, useState } from "react";
import goPopularImg from "../../assets/Go Popular.webp";
import { eventBus } from "../../core/eventBus";

/**
 * Only the dedicated Go Popular/Cocazo animation lives here.
 * The received-gift information card is rendered once by the scoreboard.
 */
export function GiftFeed() {
  const [cocazo, setCocazo] = useState(null);

  useEffect(() => {
    const unsubStarted = eventBus.subscribe("ability:started", item => {
      if (item?.abilityId !== "cocazo") return;
      setCocazo({
        username: item.sender || item.username || "JUGADOR",
        executionId: item.executionId || Date.now()
      });
    });
    const unsubFinished = eventBus.subscribe("ability:finished", item => {
      if (item?.abilityId === "cocazo") setCocazo(null);
    });
    return () => { unsubStarted?.(); unsubFinished?.(); };
  }, []);

  if (!cocazo) return null;
  return (
    <div className="cocazo-live-effect" key={cocazo.executionId} aria-label="Cocazo activado">
      <div className="cocazo-impact-ring" />
      <div className="cocazo-particles">🥥</div>
      <img src={goPopularImg} alt="Go Popular" className="cocazo-gift-image" />
      <div className="cocazo-title">💥 COCAZO 💥</div>
      <div className="cocazo-sender">{cocazo.username}</div>
      <div className="cocazo-subtitle">GO POPULAR • ¡IMPACTO!</div>
    </div>
  );
}
