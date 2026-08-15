import { GiftImage } from "../common/GiftImage";

export function GiftFeed({ alert, showWin, winner, epicEvent, epicGift }) {
  const getGiftPhrase = (giftName = "") => {
    const name = String(giftName).toLowerCase();
    if (name.includes("sombrero") || name.includes("hat")) {
      const phrases = [
        "MOMENTO ARTÍSTICO",
        "RETO CREATIVO",
        "MODO ARTISTA",
        "ACTÚA O ADIVINA"
      ];
      return phrases[Math.floor(Math.random() * phrases.length)];
    } else if (name.includes("donas") || name.includes("donut")) {
      const phrases = [
        "MOMENTO DE RETO",
        "MICRÓFONO EN SILENCIO",
        "EL MUDO ACTIVADO",
        "RISAS EN EL CHAT"
      ];
      return phrases[Math.floor(Math.random() * phrases.length)];
    } else if (name.includes("galaxy") || name.includes("galaxia")) {
      return "ULTIMATE GALAXY ENERGY";
    } else if (name.includes("money gun") || name.includes("pistola")) {
      return "EPIC IMPACT BULLET STORM";
    } else if (name.includes("freeze") || name.includes("star") || name.includes("congel")) {
      return "CASTIGO CONGELAMIENTO";
    } else {
      const phrases = [
        "VIENE CON TODO",
        "NO SUELTA EL ACELERADOR",
        "ESTÁ ROMPIENDO LA RONDA"
      ];
      return phrases[Math.floor(Math.random() * phrases.length)];
    }
  };

  const giftDisplay = epicEvent?.giftDisplay || "🤠 SOMBRERO";
  const isHatGift = String(giftDisplay).toLowerCase().includes("sombrero") || String(giftDisplay).toLowerCase().includes("hat");
  const isDonutGift = String(giftDisplay).toLowerCase().includes("donas") || String(giftDisplay).toLowerCase().includes("donut");
  const isGalaxyGift = String(giftDisplay).toLowerCase().includes("galaxy") || String(giftDisplay).toLowerCase().includes("galaxia");
  const isMoneyGunGift = String(giftDisplay).toLowerCase().includes("money gun") || String(giftDisplay).toLowerCase().includes("pistola");
  const isFreezeGift = String(giftDisplay).toLowerCase().includes("freeze") || String(giftDisplay).toLowerCase().includes("star") || String(giftDisplay).toLowerCase().includes("congel");
  
  const phrase = epicEvent?.tagline || getGiftPhrase(giftDisplay);

  const rawName = winner ? (winner.title || winner.name || "CHICOS") : "";
  const displayName = rawName.replace("GANAN LA RONDA", "").replace("VICTORIA DE RONDA", "").trim();

  const formatAlertText = (rawAlert) => {
    if (!rawAlert) return { icon: "💥", player: "SISTEMA", action: "ACTIVO" };
    const text = String(rawAlert).toUpperCase();
    
    let icon = "💥";
    let player = "JUGADOR";
    let action = "ACCIÓN";

    if (text.includes("GALAXY") || text.includes("ULTIMATE ENERGY")) {
      player = text.includes("FERNANDO") ? "FERNANDO" : "JUGADOR";
      action = "GALAXY";
    } else if (text.includes("MONEY GUN") || text.includes("BULLET STORM")) {
      player = "EQUIPO";
      action = "DESTRUIDO";
    } else if (text.includes("FREEZE") || text.includes("CASTIGO")) {
      player = text.includes("FERNANDO") ? "FERNANDO" : "MODERADOR";
      action = "CONGELADO";
    } else if (text.includes("SOMBRERO") || text.includes("HAT")) {
      player = "RETO CREATIVO";
      action = "MODO ARTISTA";
    } else if (text.includes("DONAS") || text.includes("DONUT") || text.includes("ANNA")) {
      player = "EL MUDO";
      action = "RETO ACTIVO";
    } else if (text.includes("CHICOS")) {
      player = "CHICOS";
      action = "+1 RONDA";
    } else if (text.includes("CHICAS")) {
      player = "CHICAS";
      action = "+1 RONDA";
    } else {
      player = "JUGADOR";
      action = "PUNTOS";
    }

    return { icon, player, action };
  };

  const alertObj = formatAlertText(alert);

  return (
    <>
      {epicGift && (
        <div style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          background: "linear-gradient(135deg, rgba(255, 215, 0, 0.98), rgba(220, 80, 0, 0.98))",
          border: "2.5px solid #ffffff",
          borderRadius: "10px",
          padding: "12px 24px",
          textAlign: "center",
          boxShadow: "0 0 45px rgba(255, 215, 0, 0.95), 0 0 20px rgba(255,255,255,0.9)",
          animation: "epicImpactPop 1.2s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards",
          zIndex: 1000,
          color: "#0c091a",
          minWidth: "160px"
        }}>
          <div style={{ width: "36px", height: "36px", margin: "0 auto", filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))" }}>
            <GiftImage giftId={epicGift.giftName} fallbackIcon={epicGift.icon} style={{ width: "36px", height: "36px" }} />
          </div>
          <div style={{ fontSize: "11px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "1.2px", color: "#1a0c00", marginTop: "2px" }}>{epicGift.username}</div>
          <div style={{ fontSize: "15px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "1.5px", color: "#ffffff", textShadow: "0 2px 4px rgba(0,0,0,0.8)", marginTop: "1px" }}>{epicGift.giftName}!</div>
        </div>
      )}

      {alert && (
        <div className="broadcast-event-banner">
          <div className="broadcast-banner-icon" style={{ width: "20px", height: "20px", margin: "0 auto" }}>
            <GiftImage giftId={alertObj.action} fallbackIcon={alertObj.icon} style={{ width: "20px", height: "20px" }} />
          </div>
          <div className="broadcast-banner-player">{alertObj.player}</div>
          <div className="broadcast-banner-action">{alertObj.action}</div>
        </div>
      )}

      {epicEvent && (
        <div className="central-narrator-feed" style={{
          position: "absolute",
          top: "2%",
          left: "50%",
          transform: "translateX(-50%)",
          background: isHatGift ? "linear-gradient(135deg, rgba(140, 60, 20, 0.95), rgba(90, 30, 10, 0.98))" : isDonutGift ? "linear-gradient(135deg, rgba(140, 60, 20, 0.95), rgba(70, 20, 60, 0.98))" : isGalaxyGift ? "linear-gradient(135deg, rgba(0, 90, 200, 0.95), rgba(120, 0, 200, 0.98))" : isMoneyGunGift ? "linear-gradient(135deg, rgba(180, 20, 20, 0.95), rgba(90, 10, 10, 0.98))" : isFreezeGift ? "linear-gradient(135deg, rgba(0, 120, 200, 0.95), rgba(0, 50, 140, 0.98))" : "linear-gradient(135deg, rgba(80, 20, 110, 0.95), rgba(20, 40, 90, 0.98))",
          backdropFilter: "blur(6px)",
          border: isHatGift ? "1.5px solid #ff6622" : isDonutGift ? "1.5px solid #ffaa00" : isGalaxyGift ? "1.5px solid #00ffff" : isMoneyGunGift ? "1.5px solid #ff3333" : isFreezeGift ? "1.5px solid #00f5ff" : "1px solid #ff007f",
          boxShadow: isHatGift ? "0 0 15px rgba(255,100,34,0.6)" : isDonutGift ? "0 0 15px rgba(255,170,0,0.6)" : isGalaxyGift ? "0 0 20px rgba(0,245,255,0.8)" : isMoneyGunGift ? "0 0 20px rgba(255,51,51,0.8)" : isFreezeGift ? "0 0 20px rgba(0,245,255,0.8)" : "0 0 10px rgba(255,0,127,0.4)",
          padding: "3px 10px",
          borderRadius: "4px",
          zIndex: 999,
          maxWidth: "155px",
          width: "58%",
          textAlign: "center",
          animation: "epicImpactSmooth 1.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards",
          overflow: "visible"
        }}>
          {/* Top glass reflection line */}
          <div style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "1px",
            background: isHatGift ? "linear-gradient(90deg, transparent, rgba(255,100,34,1), transparent)" : isDonutGift ? "linear-gradient(90deg, transparent, rgba(255,170,0,1), transparent)" : isGalaxyGift ? "linear-gradient(90deg, transparent, rgba(0,245,255,1), transparent)" : isMoneyGunGift ? "linear-gradient(90deg, transparent, rgba(255,51,51,1), transparent)" : isFreezeGift ? "linear-gradient(90deg, transparent, rgba(0,245,255,1), transparent)" : "linear-gradient(90deg, transparent, rgba(255,0,127,1), transparent)"
          }}></div>

          <div style={{ fontSize: "8.5px", fontWeight: 900, color: isHatGift ? "#ff9933" : isDonutGift ? "#ffaa00" : isGalaxyGift ? "#00ffff" : isMoneyGunGift ? "#ff9999" : isFreezeGift ? "#00f5ff" : "#00f5ff", textShadow: "0 0 6px rgba(0,0,0,0.9)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "1px" }}>
            {isHatGift ? "🤠 RETO CREATIVO 🤠" : isDonutGift ? "🔇 EL MUDO 🔇" : isGalaxyGift ? "🌌 ULTIMATE GALAXY 🌌" : isMoneyGunGift ? "💥 EPIC IMPACT 💥" : isFreezeGift ? "🧊 CASTIGO FREEZE 🧊" : `💥 ${epicEvent.username || epicEvent.title || "ANNA"} 💥`}
          </div>
          <div style={{ fontSize: "5.5px", fontWeight: 900, color: "#ffffff", textTransform: "uppercase", letterSpacing: "0.3px", marginBottom: "2px" }}>
            {phrase}
          </div>
          <div style={{
            background: "rgba(0, 0, 0, 0.5)",
            border: "1px solid rgba(255, 215, 0, 0.5)",
            borderRadius: "3px",
            padding: "1px 4px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "3px", fontSize: "6.5px", fontWeight: 900, color: "#ffd700" }}>
              <span style={{ width: "12px", height: "12px", display: "inline-block" }}>
                <GiftImage giftId={giftDisplay} style={{ width: "12px", height: "12px" }} />
              </span>
              {giftDisplay}
            </span>
            <span style={{ fontSize: "6.5px", fontWeight: 900, color: "#00ffcc" }}>{isHatGift ? "¡ACTÚA!" : isDonutGift ? "¡SILENCIO!" : isGalaxyGift ? "+1 RONDA" : isMoneyGunGift ? "DESTRUIDO" : isFreezeGift ? "CONGELADO" : (epicEvent.points || "+50 PTS")}</span>
          </div>
        </div>
      )}

      {showWin && winner && (
        <div className="celebration" style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          background: "linear-gradient(135deg, rgba(255, 238, 140, 0.88) 0%, rgba(255, 185, 0, 0.84) 50%, rgba(220, 120, 0, 0.88) 100%)",
          backdropFilter: "blur(10px)",
          border: "1.5px solid rgba(255, 255, 255, 0.9)",
          boxShadow: "0 0 30px rgba(255,215,0,0.7), 0 0 12px rgba(255,255,255,0.5), inset 0 1px 3px rgba(255,255,255,0.9), inset 0 -3px 8px rgba(140,65,0,0.7)",
          padding: "6px 10px",
          borderRadius: "8px",
          zIndex: 999,
          maxWidth: "155px",
          width: "58%",
          textAlign: "center",
          animation: "goldenImpact 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), bannerBreath 4s infinite ease-in-out",
          overflow: "visible"
        }}>
          {/* Light sweep / shine effect layer */}
          <div style={{
            position: "absolute",
            top: -40,
            left: -80,
            width: "50px",
            height: "200%",
            background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.85), transparent)",
            transform: "rotate(25deg)",
            animation: "goldenShineSweep 2s infinite ease-in-out",
            pointerEvents: "none",
            zIndex: 3
          }}></div>

          {/* Top glass specular reflection */}
          <div style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "1.5px",
            background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.9), transparent)",
            zIndex: 2
          }}></div>

          <div style={{ position: "relative", zIndex: 4 }}>
            <div style={{ fontSize: "17px", lineHeight: "1.2", marginTop: "0px", marginBottom: "0px", filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.7))", animation: "bounce 0.5s infinite alternate" }}>🏆</div>
            <div style={{ color: "#0c091a", fontSize: "12.5px", fontWeight: 900, textShadow: "0 1px 2px rgba(255,255,255,0.8)", margin: "1px 0", textTransform: "uppercase", letterSpacing: "1px" }}>{displayName}</div>
            <div style={{ fontSize: "5.5px", fontWeight: 900, color: "#ffffff", background: "rgba(12, 9, 26, 0.85)", padding: "1px 5px", borderRadius: "2.5px", margin: "2px 0", textTransform: "uppercase", display: "inline-block", boxShadow: "0 0 5px rgba(0,0,0,0.5)", letterSpacing: "0.6px" }}>CHAMPION ROUND WINNER</div>

            {winner.mvps && winner.mvps.length > 0 && (
              <div style={{ marginTop: "3px", borderTop: "1px solid rgba(12,9,26,0.25)", paddingTop: "2.5px", display: "flex", flexDirection: "column", gap: "1.5px" }}>
                <div style={{ fontSize: "5.5px", fontWeight: 900, color: "#3d2900", textTransform: "uppercase", letterSpacing: "0.5px" }}>PODIO DE CAMPEONES</div>
                {winner.mvps.map((mvp, idx) => {
                  const isFirst = idx === 0;
                  const isSecond = idx === 1;
                  return (
                    <div key={idx} style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      background: isFirst ? "rgba(12, 9, 26, 0.85)" : isSecond ? "rgba(12, 9, 26, 0.75)" : "rgba(12, 9, 26, 0.6)",
                      padding: isFirst ? "2px 5px" : "1px 4px",
                      borderRadius: "2.5px",
                      fontSize: isFirst ? "8.5px" : isSecond ? "7.5px" : "7px",
                      fontWeight: isFirst ? 900 : isSecond ? 800 : 700,
                      color: isFirst ? "#ffd700" : "#e2e8f0",
                      border: isFirst ? "1px solid #ffd700" : isSecond ? "1px solid #c0c0c0" : "1px solid #cd7f32",
                      boxShadow: isFirst ? "0 0 6px rgba(255,215,0,0.4)" : "none"
                    }}>
                      <span>{isFirst ? "🥇 " : isSecond ? "🥈 " : "🥉 "}{mvp.name}</span>
                      <span style={{ color: "#ffffff" }}>{mvp.points} pts</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
