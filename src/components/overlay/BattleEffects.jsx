export function BattleEffects({ battleEffects }) {
  if (!battleEffects || !battleEffects.active) return null;

  const formatTime = (secs) => {
    const mins = Math.floor((secs || 0) / 60);
    const s = (secs || 0) % 60;
    return String(mins).padStart(2, "0") + ":" + String(s).padStart(2, "0");
  };

  let targetMessage = "";
  if (battleEffects.scope === "GLOBAL") {
    targetMessage = `TODOS`;
  } else if (battleEffects.scope === "PLAYER") {
    targetMessage = (battleEffects.affectedPlayerName || battleEffects.affectedPlayer || "JUAN").toUpperCase();
  } else {
    targetMessage = (battleEffects.affectedTeamName || battleEffects.affectedTeam || "EQUIPO").toUpperCase();
  }

  const remainingSeconds = battleEffects.remainingTime !== undefined ? battleEffects.remainingTime : 27;
  const isUrgent = remainingSeconds <= 10;

  return (
    <div className={`battle-freeze-box ${isUrgent ? "urgent" : ""}`} data-freeze-hud="true">
      <div className="freeze-header">
        ❄️ FREEZE ACTIVO
      </div>
      <div className="freeze-target">
        {targetMessage}
      </div>
      <div className="freeze-timer">
        ⏱ {formatTime(remainingSeconds)}
      </div>
    </div>
  );
}
