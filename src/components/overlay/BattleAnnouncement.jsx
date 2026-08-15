import { useEffect, useState } from "react";
import { eventBus } from "../../core/eventBus";

export function BattleAnnouncement() {
  const [announcement, setAnnouncement] = useState(null);

  useEffect(() => {
    const showMessage = (msg, duration = 3500, priority = "standard") => {
      setAnnouncement({ text: msg, priority });
      const t = setTimeout(() => {
        setAnnouncement(null);
      }, duration);
      return () => clearTimeout(t);
    };

    const unsub1 = eventBus.subscribe("effect:activated", (e) => {
      showMessage(`🧊 ${e.activatedBy || "JUGADOR"} CONGELÓ A ${e.affectedTeamName || e.affectedTeam}`, 3500, "special");
    });

    const unsub2 = eventBus.subscribe("effect:removed", (e) => {
      showMessage(`⚡ ${e.activatedBy || "EQUIPO"} CONTRAATACA / DESCONGELA!`, 3500, "special");
    });

    const unsub3 = eventBus.subscribe("reward:processed", (e) => {
      const diamondVal = e.diamondValue || 0;
      if (diamondVal >= 1000) {
        showMessage(`🌌 GALAXY ULTIMATE DE ${e.username} (+${e.points} PTS)!`, 5000, "ultimate");
      } else if (diamondVal >= 500) {
        showMessage(`💥 MONEY GUN EPIC DE ${e.username} (+${e.points} PTS)!`, 4500, "epic");
      } else if (diamondVal >= 50) {
        showMessage(`🤠 COWBOY HAT DE ${e.username} (+${e.points} PTS)!`, 4000, "special");
      } else if (diamondVal >= 30) {
        showMessage(`🍩 DONUT DE ${e.username} (+${e.points} PTS)!`, 3500, "standard");
      }
    });

    return () => {
      unsub1 && unsub1();
      unsub2 && unsub2();
      unsub3 && unsub3();
    };
  }, []);

  if (!announcement) return null;

  const getGradient = (priority) => {
    switch (priority) {
      case "ultimate":
        return "linear-gradient(135deg, rgba(120, 0, 255, 0.98), rgba(0, 245, 255, 0.98))";
      case "epic":
        return "linear-gradient(135deg, rgba(255, 215, 0, 0.98), rgba(255, 100, 0, 0.98))";
      case "special":
        return "linear-gradient(135deg, rgba(255, 100, 50, 0.98), rgba(200, 30, 80, 0.98))";
      case "standard":
      default:
        return "linear-gradient(135deg, rgba(255, 140, 0, 0.98), rgba(220, 50, 50, 0.98))";
    }
  };

  return (
    <div style={{
      position: "absolute",
      top: "105px",
      left: "50%",
      transform: "translateX(-50%)",
      zIndex: 250,
      background: getGradient(announcement.priority),
      border: "2px solid #ffd700",
      borderRadius: "8px",
      padding: "6px 18px",
      textAlign: "center",
      boxShadow: "0 0 25px rgba(255, 215, 0, 0.8)",
      animation: "cinematicFadeIn 0.3s ease",
      color: announcement.priority === "epic" ? "#000" : "#ffffff",
      fontSize: "13px",
      fontWeight: "900",
      letterSpacing: "0.8px",
      textTransform: "uppercase",
      whiteSpace: "nowrap"
    }}>
      {announcement.text}
    </div>
  );
}
