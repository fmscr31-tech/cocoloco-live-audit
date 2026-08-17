import { useState, useEffect, useRef } from "react";
import { tikTokConnector } from "../../core/connectors/tiktokConnector";
import { connectorManager } from "../../core/connectors/connectorManager";
import { eventBus } from "../../core/eventBus";
import { giftEventBridge } from "../../core/giftEventBridge";
import { dashboardAPI } from "../../core/dashboardAPI";

function formatGameMode(mode) {
  const value = String(mode || "").toUpperCase().replace(/[- ]/g, "_");
  if (value === "GENDER_TEAMS" || value === "CHICOS_VS_CHICAS") return "CHICOS VS CHICAS";
  if (value === "TEAM" || value === "TEAMS" || value === "EQUIPOS") return "EQUIPOS";
  return "INDIVIDUAL";
}

export function GlobalLiveStatusHeader({ onStatusChange }) {
  const [tiktokStatus, setTiktokStatus] = useState("DISCONNECTED");
  const [tikfinityStatus, setTikfinityStatus] = useState("DISCONNECTED");
  const [lastEventTime, setLastEventTime] = useState(null);
  const lastEventRef = useRef(null);
  const [eventCount, setEventCount] = useState(0);
  const [isConnecting, setIsConnecting] = useState(false);
  const [timeAgo, setTimeAgo] = useState("No events received");
  const [liveInputActive, setLiveInputActive] = useState(() => giftEventBridge.isLiveInputEnabled());
  const [gameMode, setGameMode] = useState(() => dashboardAPI.getGameMode());

  useEffect(() => {
    const markEvent = () => {
      const now = Date.now();
      lastEventRef.current = now;
      setLastEventTime(now);
      setEventCount(c => c + 1);
    };
    const unsubEvent = eventBus.subscribe("normalized:gift", markEvent);
    const unsubChat = eventBus.subscribe("normalized:chat", markEvent);
    const unsubJoin = eventBus.subscribe("normalized:join", markEvent);
    const unsubInputStatus = eventBus.subscribe("live:input_status", payload => {
      if (payload && typeof payload.enabled === "boolean") setLiveInputActive(payload.enabled);
    });
    const unsubMode = dashboardAPI.subscribeToModeChange(({ mode }) => setGameMode(mode));

    const interval = setInterval(() => {
      const statuses = connectorManager.getStatusAll();
      setTiktokStatus(tikTokConnector.status || statuses.tiktok?.status || "DISCONNECTED");
      setTikfinityStatus(statuses.tikfinity?.status || "CONNECTED");
      setLiveInputActive(giftEventBridge.isLiveInputEnabled());
      setGameMode(dashboardAPI.getGameMode());
      const eventTime = lastEventRef.current;
      if (eventTime) {
        const diffSec = Math.floor((Date.now() - eventTime) / 1000);
        setTimeAgo(`Last event: ${diffSec}s ago${diffSec >= 30 ? " (Waiting)" : ""}`);
      } else {
        setTimeAgo("No events received");
      }
    }, 1000);

    return () => {
      unsubEvent(); unsubChat(); unsubJoin(); unsubInputStatus(); unsubMode(); clearInterval(interval);
    };
  }, []);

  const isTiktokConnected = tiktokStatus === "CONNECTED";
  const isTikfinityConnected = tikfinityStatus === "CONNECTED" || tikfinityStatus === "ACTIVE";
  const hasRecentEvents = lastEventTime && (Date.now() - lastEventTime < 30000);

  let globalStatus = "OFFLINE";
  let globalColor = "#ff3333";
  let globalBg = "rgba(255,51,51,.12)";
  let globalBorder = "1px solid rgba(255,51,51,.4)";
  if (isTiktokConnected && isTikfinityConnected && hasRecentEvents && liveInputActive) {
    globalStatus = "LIVE READY"; globalColor = "#00ffcc"; globalBg = "rgba(0,255,204,.12)"; globalBorder = "1px solid rgba(0,255,204,.4)";
  } else if (!liveInputActive) {
    globalStatus = "LIVE INPUT OFF"; globalColor = "#ffaa00"; globalBg = "rgba(255,170,0,.12)"; globalBorder = "1px solid rgba(255,170,0,.4)";
  } else if (isTiktokConnected || isTikfinityConnected) {
    globalStatus = "DEGRADED"; globalColor = "#ffd700"; globalBg = "rgba(255,215,0,.12)"; globalBorder = "1px solid rgba(255,215,0,.4)";
  }

  if (onStatusChange) onStatusChange(globalStatus);

  const handleToggleConnect = async () => {
    setIsConnecting(true);
    try {
      if (isTiktokConnected) await tikTokConnector.disconnect();
      else await tikTokConnector.connect({ mode: "REAL_TIKTOK" });
    } catch (e) {
      if (!isTiktokConnected) {
        try { await tikTokConnector.connect({ mode: "MOCK_TIKTOK" }); } catch (ignored) {}
      }
    } finally { setIsConnecting(false); }
  };

  const handleToggleLiveInput = () => liveInputActive ? giftEventBridge.disableLiveInput() : giftEventBridge.enableLiveInput();
  const displayMode = formatGameMode(gameMode);
  const modeColor = displayMode === "CHICOS VS CHICAS" ? "#ff5da2" : displayMode === "EQUIPOS" ? "#00f5ff" : "#ffd700";

  return (
    <div style={{ display:"flex", flexWrap:"wrap", justifyContent:"space-between", alignItems:"center", background:globalBg, border:globalBorder, borderRadius:"10px", padding:"10px 16px", marginBottom:"16px", boxShadow:`0 0 20px ${globalColor}25`, transition:"all .3s ease", gap:"10px" }}>
      <div style={{ display:"flex", alignItems:"center", gap:"12px", flexWrap:"wrap" }}>
        <div style={{ fontSize:"14px", fontWeight:900, color:globalColor, textTransform:"uppercase", letterSpacing:"1px", textShadow:`0 0 10px ${globalColor}80` }}>
          {globalStatus === "LIVE READY" ? "🟢 LIVE READY" : globalStatus === "LIVE INPUT OFF" ? "🟠 LIVE INPUT OFF" : globalStatus === "DEGRADED" ? "🟡 DEGRADED" : "🔴 OFFLINE / ERROR"}
        </div>
        <div style={{ fontSize:"11px", color:"#cbd5e0", fontWeight:700 }}>
          {globalStatus === "LIVE READY" ? "Sistema listo para transmitir en vivo" : globalStatus === "LIVE INPUT OFF" ? "Entrada de regalos pausada" : "Comprobando conexiones y flujos"}
        </div>
        <div style={{ background:"#0c091a", border:`1px solid ${modeColor}80`, borderRadius:"8px", padding:"6px 11px", display:"flex", alignItems:"center", gap:"7px", boxShadow:`0 0 12px ${modeColor}22` }}>
          <span style={{ fontSize:"9px", color:"#94a3b8", fontWeight:900, textTransform:"uppercase", letterSpacing:".8px" }}>MODO ÚNICO</span>
          <span style={{ fontSize:"12px", color:modeColor, fontWeight:950, textTransform:"uppercase" }}>{displayMode}</span>
        </div>
      </div>

      <div style={{ display:"flex", gap:"12px", alignItems:"center", flexWrap:"wrap" }}>
        <div style={{ fontSize:"11px" }}>TikTok LIVE: <span style={{ color:isTiktokConnected?"#00ffcc":"#ff3333", fontWeight:800 }}>{isTiktokConnected?"🟢 Connected":"🔴 Disconnected"}</span></div>
        <div style={{ fontSize:"11px" }}>TikFinity: <span style={{ color:isTikfinityConnected?"#00ffcc":"#ffd700", fontWeight:800 }}>{isTikfinityConnected?"🟢 Connected":"🟡 Waiting"}</span></div>
        <div style={{ fontSize:"11px" }}>Events: <span style={{ color:hasRecentEvents?"#00ffcc":"#ffd700", fontWeight:800 }}>{hasRecentEvents?"🟢 Receiving":"🟡 Waiting"}</span> <span style={{fontSize:"9.5px",color:"#a0aec0"}}>({timeAgo})</span></div>
        <button onClick={handleToggleLiveInput} style={{ background:liveInputActive?"linear-gradient(135deg,#38a169,#2f855a)":"linear-gradient(135deg,#e53e3e,#c53030)", color:"#fff", border:"none", padding:"6px 14px", borderRadius:"6px", fontSize:"11px", fontWeight:900, cursor:"pointer", textTransform:"uppercase" }}>{liveInputActive?"🟢 LIVE INPUT: ON":"🔴 LIVE INPUT: OFF"}</button>
        <button onClick={handleToggleConnect} disabled={isConnecting} style={{ background:isTiktokConnected?"linear-gradient(135deg,#e53e3e,#c53030)":"linear-gradient(135deg,#319795,#2b6cb0)", color:"#fff", border:"none", padding:"6px 14px", borderRadius:"6px", fontSize:"11px", fontWeight:900, cursor:"pointer", textTransform:"uppercase" }}>{isConnecting?"⏳ CONNECTING...":isTiktokConnected?"🔌 DISCONNECT LIVE":"🔌 CONNECT LIVE"}</button>
      </div>
    </div>
  );
}
