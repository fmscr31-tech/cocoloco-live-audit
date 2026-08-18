import { useState, useEffect } from "react";
import { IndividualPanel } from "./IndividualPanel";
import { IndividualJoinPrompt } from "./IndividualJoinPrompt";
import { eventBus } from "../../core/eventBus";

/** Production broadcast overlay: INDIVIDUAL mode only. */
export function ScoreBoard({ players, timer, round, frozenTeamId, roundMvpTitle, frozenDetails, moneyGunTeamId, galaxyTeamId, galaxyPopup, donutTeamId, hatTeamId, highlightedPlayerId, showWin, winner, onTestWin, battleEffects }) {
  const [internalShowWin, setInternalShowWin] = useState(false);
  const [activityQueue, setActivityQueue] = useState([]);
  const [currentEvent, setCurrentEvent] = useState(null);

  useEffect(() => {
    if (activityQueue.length > 0 && !currentEvent) {
      const next = activityQueue[0];
      setCurrentEvent(next);
      const timerId = setTimeout(() => {
        setActivityQueue(prev => prev.slice(1));
        setCurrentEvent(null);
      }, 4000);
      return () => clearTimeout(timerId);
    }
    return undefined;
  }, [activityQueue, currentEvent]);

  useEffect(() => {
    const handleWinNotification = data => {
      const playerName = (data?.name || data?.username || data?.player?.name || "JUGADOR").toUpperCase();
      const pointsVal = data?.points || data?.player?.points || 1;
      setActivityQueue(prev => [...prev, { id: Date.now() + Math.random(), headerIcon: "✨", headerTitle: "WIN LIMPIA", donorName: `🥥 ${playerName}`, effectText: `+${pointsVal} PTS` }]);
    };
    const unsubWin = eventBus.subscribe("win:correct", handleWinNotification);
    return () => unsubWin?.();
  }, []);

  const effectiveShowWin = showWin || internalShowWin;
  const effectiveWinner = winner || { name: players?.[0]?.name || players?.[0]?.displayName || "FERNANDO", points: players?.[0]?.points || 0 };
  const handleTestWinnerClick = () => {
    setInternalShowWin(true);
    onTestWin?.();
    setTimeout(() => setInternalShowWin(false), 5000);
  };

  return (
    <div className="scoreboard individual-scoreboard-shell" style={{ position: "relative" }}>
      <IndividualJoinPrompt />
      <IndividualPanel players={players} timer={timer} round={round} roundMvpTitle={roundMvpTitle} donutTeamId={donutTeamId} hatTeamId={hatTeamId} galaxyTeamId={galaxyTeamId} galaxyPopup={galaxyPopup} moneyGunTeamId={moneyGunTeamId} frozenTeamId={frozenTeamId} frozenDetails={frozenDetails} highlightedPlayerId={highlightedPlayerId} showWin={effectiveShowWin} winner={effectiveWinner} onTestWin={handleTestWinnerClick} battleEffects={battleEffects} />
      {currentEvent && (
        <div className="timer-feed-compact-card" style={{ minHeight: "62px", minWidth: "92px", maxWidth: "118px", padding: "5px", borderRadius: "7px", background: "linear-gradient(135deg,rgba(20,15,40,.98),rgba(140,70,10,.98))", border: "1.5px solid #fff", boxShadow: "0 0 18px rgba(255,215,0,.7)", textAlign: "center", position: "absolute", left: "50%", bottom: "0", transform: "translateX(-50%)", zIndex: 50 }}>
          <div style={{ fontSize: "7.5px", fontWeight: 950, color: "#ffd700", textTransform: "uppercase" }}>{currentEvent.headerIcon} {currentEvent.headerTitle}</div>
          <div style={{ fontSize: "7px", fontWeight: 950, color: "#fff", margin: "2px 0" }}>{currentEvent.donorName}</div>
          <div style={{ fontSize: "6.5px", fontWeight: 950, color: "#fff" }}>{currentEvent.effectText}</div>
        </div>
      )}
    </div>
  );
}

export default ScoreBoard;
