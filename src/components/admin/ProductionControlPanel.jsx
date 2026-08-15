import { useState, useEffect } from "react";
import { tikTokConnector } from "../../core/connectors/tiktokConnector";
import { tiktokConfig } from "../../config/tiktok";
import { dashboardAPI } from "../../core/dashboardAPI";
import { eventBus } from "../../core/eventBus";
import { clearEvents } from "../../core/eventManager";
import { registrationManager } from "../../core/registrationManager";

export function ProductionControlPanel() {
  const [dashboard, setDashboard] = useState(dashboardAPI.getLiveDashboard());
  const [tiktokUsername, setTiktokUsername] = useState(tiktokConfig.getSavedUsername());
  const [connectorStatus, setConnectorStatus] = useState("DISCONNECTED");
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    const unsub = dashboardAPI.subscribe((dash) => {
      setDashboard(dash);
      setConnectorStatus(tikTokConnector.status || "DISCONNECTED");
    });
    const interval = setInterval(() => {
      setConnectorStatus(tikTokConnector.status || "DISCONNECTED");
    }, 1000);
    return () => {
      unsub && unsub();
      clearInterval(interval);
    };
  }, []);

  const notify = (msg) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3500);
  };

  const handleConnectTikTok = async () => {
    if (!tiktokUsername) {
      alert("Por favor ingresa un nombre de usuario de TikTok.");
      return;
    }
    try {
      tiktokConfig.saveUsername(tiktokUsername);
      setConnectorStatus("CONNECTING");
      await tikTokConnector.connect({ mode: "REAL_TIKTOK", username: tiktokUsername });
      setConnectorStatus("CONNECTED");
      notify(`✅ Conectado a TikTok LIVE (@${tiktokUsername}) exitosamente.`);
    } catch (e) {
      setConnectorStatus("ERROR");
      notify("❌ Error conectando a TikTok LIVE.");
    }
  };

  const handleResetOverlay = () => {
    try {
      eventBus.publish("overlay:reset", {});
      notify("🔄 Overlay reiniciado visualmente en tiempo real.");
    } catch (e) {
      notify("❌ Error reiniciando overlay.");
    }
  };

  const handleNewLiveSession = () => {
    if (window.confirm("¿Estás seguro de iniciar una NUEVA sesión LIVE? Se limpiarán jugadores y eventos anteriores, manteniendo la configuración.")) {
      try {
        localStorage.removeItem("cocoloco_battle");
        localStorage.removeItem("cocoloco_live_data");
        localStorage.removeItem("cocoloco_teams");
        localStorage.removeItem("cocoloco_session");
        clearEvents();
        registrationManager.clearRegistration();
        eventBus.publish("overlay:reset", {});
        window.location.reload();
      } catch (e) {
        notify("❌ Error reiniciando sesión.");
      }
    }
  };

  const stats = dashboard.statistics?.session || { totalParticipants: 0, eventsProcessed: 0, totalGifts: 0, generatedPoints: 0, totalMessages: 0, totalLikes: 0 };
  const recentActivity = dashboard.recentActivity || [];

  return (
    <div style={{
      background: "linear-gradient(135deg, #191426, #120d22)",
      border: "1px solid rgba(0, 245, 255, 0.2)",
      borderRadius: "14px",
      padding: "20px",
      boxShadow: "0 8px 30px rgba(0,0,0,0.6)",
      color: "white"
    }}>
      <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "14px", flexWrap: "wrap", gap: "10px"}}>
        <div>
          <h2 style={{margin: 0, fontSize: "18px", color: "#00f5ff", textTransform: "uppercase", letterSpacing: "1px"}}>
            🔴 Live Dashboard & Monitor
          </h2>
          <div style={{fontSize: "11px", color: "#a0aec0", marginTop: "2px"}}>
            Monitorización en tiempo real del LIVE, métricas de interacción y actividad del chat
          </div>
        </div>
        <div style={{display: "flex", gap: "8px", flexWrap: "wrap"}}>
          <button
            onClick={handleResetOverlay}
            style={{background: "linear-gradient(135deg, #d69e2e, #b7791f)", color: "white", border: "none", padding: "8px 12px", borderRadius: "8px", fontWeight: 800, cursor: "pointer", fontSize: "12px"}}
          >
            🔄 RESET OVERLAY
          </button>
          <button
            onClick={handleNewLiveSession}
            style={{background: "linear-gradient(135deg, #e53e3e, #c53030)", color: "white", border: "none", padding: "8px 12px", borderRadius: "8px", fontWeight: 800, cursor: "pointer", fontSize: "12px"}}
          >
            🔄 NUEVA SESIÓN
          </button>
        </div>
      </div>

      <div style={{display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px", marginBottom: "20px"}}>
        
        {/* 1. TIKTOK CONNECTION PANEL */}
        <div style={{background: "#120f1d", padding: "14px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.08)"}}>
          <h4 style={{margin: "0 0 8px 0", fontSize: "13px", color: "#ffd700", textTransform: "uppercase"}}>
            🔌 1. Conexión TikTok LIVE
          </h4>
          <div style={{display: "flex", gap: "8px", marginBottom: "8px"}}>
            <input
              type="text"
              placeholder="@tu_usuario"
              value={tiktokUsername}
              onChange={(e) => setTiktokUsername(e.target.value)}
              style={{
                flex: 1,
                background: "#0c091a",
                color: "white",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: "6px",
                padding: "8px 10px",
                fontSize: "13px"
              }}
            />
            <button
              onClick={handleConnectTikTok}
              style={{
                background: connectorStatus === "CONNECTED" ? "#48bb78" : "linear-gradient(135deg, #805ad5, #6b46c1)",
                color: "white",
                border: "none",
                padding: "8px 14px",
                borderRadius: "6px",
                fontWeight: 800,
                cursor: "pointer",
                fontSize: "12px"
              }}
            >
              {connectorStatus === "CONNECTED" ? "CONNECTED ✓" : "[CONECTAR]"}
            </button>
          </div>
          <div style={{fontSize: "11px", color: "#a0aec0", display: "flex", justifyContent: "space-between"}}>
            <span>Estado Conexión:</span>
            <span style={{fontWeight: 800, color: connectorStatus === "CONNECTED" ? "#48bb78" : connectorStatus === "CONNECTING" ? "#d69e2e" : "#e53e3e"}}>
              {connectorStatus}
            </span>
          </div>
        </div>

        {/* 2. LIVE METRICS */}
        <div style={{background: "#120f1d", padding: "14px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.08)"}}>
          <h4 style={{margin: "0 0 10px 0", fontSize: "13px", color: "#ffd700", textTransform: "uppercase"}}>
            📊 2. Métricas del Live
          </h4>
          <div style={{display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "8px", fontSize: "12px"}}>
            <div style={{background: "#0c091a", padding: "8px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.05)"}}>
              <div style={{fontSize: "10px", color: "#a0aec0"}}>❤️ Likes</div>
              <div style={{fontSize: "15px", fontWeight: 800, color: "#ff3366"}}>{stats.totalLikes || 0}</div>
            </div>
            <div style={{background: "#0c091a", padding: "8px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.05)"}}>
              <div style={{fontSize: "10px", color: "#a0aec0"}}>🎁 Gifts</div>
              <div style={{fontSize: "15px", fontWeight: 800, color: "#ffd700"}}>{stats.totalGifts || 0}</div>
            </div>
            <div style={{background: "#0c091a", padding: "8px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.05)"}}>
              <div style={{fontSize: "10px", color: "#a0aec0"}}>💬 Mensajes</div>
              <div style={{fontSize: "15px", fontWeight: 800, color: "#00f5ff"}}>{stats.totalMessages || 0}</div>
            </div>
            <div style={{background: "#0c091a", padding: "8px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.05)"}}>
              <div style={{fontSize: "10px", color: "#a0aec0"}}>👥 Participantes</div>
              <div style={{fontSize: "15px", fontWeight: 800, color: "#48bb78"}}>{stats.totalParticipants || 0}</div>
            </div>
          </div>
        </div>

      </div>

      {/* 3. LIVE ACTIVITY / CHAT INTERACTION FEED */}
      <div style={{background: "#120f1d", padding: "16px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.08)"}}>
        <h4 style={{margin: "0 0 10px 0", fontSize: "13px", color: "#00f5ff", textTransform: "uppercase"}}>
          💬 3. Actividad Reciente del Live & Chat (Para interactuar con la audiencia)
        </h4>
        <div style={{maxHeight: "220px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "6px"}}>
          {recentActivity.length === 0 ? (
            <div style={{fontSize: "12px", color: "#a0aec0", fontStyle: "italic", textAlign: "center", padding: "16px"}}>
              Sin actividad reciente registrada en este LIVE.
            </div>
          ) : (
            recentActivity.map((user, idx) => (
              <div key={user.id || idx} style={{background: "#0c091a", padding: "8px 12px", borderRadius: "6px", display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid rgba(255,255,255,0.05)", fontSize: "12px"}}>
                <div>
                  <span style={{fontWeight: 800, color: "#ffd700"}}>{user.displayName || user.username || "Usuario"}</span>
                  <span style={{color: "#a0aec0", marginLeft: "8px", fontSize: "11px"}}>
                    (Puntos: <strong style={{color: "#00f5ff"}}>{user.points || 0}</strong> | Mensajes: {user.messages || 0} | Gifts: {user.gifts || 0} | Likes: {user.likes || 0})
                  </span>
                </div>
                <div style={{fontSize: "10px", color: "#48bb78", fontWeight: 700}}>
                  Activo 🔥
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {feedback && (
        <div style={{marginTop: "14px", background: "rgba(72,187,120,0.15)", border: "1px solid #48bb78", padding: "10px", borderRadius: "8px", fontSize: "12px", color: "#48bb78", fontWeight: 700, textAlign: "center"}}>
          {feedback}
        </div>
      )}
    </div>
  );
}
