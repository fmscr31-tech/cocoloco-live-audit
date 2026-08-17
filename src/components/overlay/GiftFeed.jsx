import { useEffect, useState } from "react";
import { eventBus } from "../../core/eventBus";

/**
 * Gift information is rendered exactly once by ScoreBoard.
 * This component is reserved exclusively for the dedicated Go Popular
 * / Cocazo visual animation, so a gift can never create a second popup.
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

    return () => {
      unsubStarted?.();
      unsubFinished?.();
    };
  }, []);

  if (!cocazo) return null;

  return (
    <div className="cocazo-live-effect" key={cocazo.executionId} aria-label="Cocazo activado">
      <div className="cocazo-impact-ring" />
      <div className="cocazo-particles">🥥</div>
      <div className="cocazo-title">💥 COCAZO 💥</div>
      <div className="cocazo-sender">{cocazo.username}</div>
    </div>
  );
}
