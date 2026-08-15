import { useState, useEffect } from "react";
import { tikTokConnector } from "../../core/connectors/tiktokConnector";
import { connectorManager } from "../../core/connectors/connectorManager";
import { eventMonitor } from "../../core/connectors/eventMonitor";
import { eventBus } from "../../core/eventBus";
import { giftEventBridge } from "../../core/giftEventBridge";

/**
 * GlobalLiveStatusHeader v2 — Global LIVE Status & Live Input Kill Switch Monitor
 * Permanently visible in the Admin Panel header across all tabs.
 * Observes TikTok LIVE connection, TikFinity status, Event Stream (with last event timestamp),
 * Game Engine state, and authoritatively controls the Live Input Kill Switch.
 */
export function GlobalLiveStatusHeader({ onStatusChange }) {
  const [tiktokStatus, setTiktokStatus] = useState("DISCONNECTED");
  const [tikfinityStatus, setTikfinityStatus] = useState("DISCONNECTED");
  const [lastEventTime, setLastEventTime] = useState(null);
  const [eventCount, setEventCount] = useState(0);
  const [isConnecting, setIsConnecting] = useState(false);
  const [timeAgo, setTimeAgo] = useState("No events received");
  const [liveInputActive, setLiveInputActive] = useState(() => giftEventBridge.isLiveInputEnabled());

  // Track event stream timestamps and live input status
  useEffect(() => {
    const unsubEvent = eventBus.subscribe("normalized:gift", () => {
      setLastEventTime(Date.now());
      setEventCount(c => c + 1);
    });
    const unsubChat = eventBus.subscribe("normalized:chat", () => {
      setLastEventTime(Date.now());
      setEventCount(c => c + 1);
    });
    const unsubJoin = eventBus.subscribe("normalized:join", () => {
      setLastEventTime(Date.now());
      setEventCount(c => c + 1);
    });
    const unsubInputStatus = eventBus.subscribe("live:input_status", (payload) => {
      if (payload && typeof payload.enabled === "boolean") {
        setLiveInputActive(payload.enabled);
      }
    });

    const interval = setInterval(() => {
      const statuses = connectorManager.getStatusAll();
      const tkStatus = tikTokConnector.status || statuses.tiktok?.status || "DISCONNECTED";
      const tfStatus = statuses.tikfinity?.status || "CONNECTED";

      setTiktokStatus(tkStatus);
      setTikfinityStatus(tfStatus);
      setLiveInputActive(giftEventBridge.isLiveInputEnabled());

      if (lastEventTime) {
        const diffSec = Math.floor((Date.now() - lastEventTime) / 1000);
        if (diffSec < 5) {
          setTimeAgo(`Last event: ${diffSec}s ago`);
        } else if (diffSec < 30) {
          setTimeAgo(`Last event: ${diffSec}s ago`);
        } else {
          setTimeAgo(`Last event: ${diffSec}s ago (Waiting)`);
        }
      } else {
        setTimeAgo("No events received");
      }
    }, 1000);

    return () => {
      unsubEvent();
      unsubChat();
      unsubJoin();
      unsubInputStatus();
      clearInterval(interval);
    };
  }, [lastEventTime]);

  // Derive Global Status
  const isTiktokConnected = tiktokStatus === "CONNECTED";
  const isTikfinityConnected = tikfinityStatus === "CONNECTED" || tikfinityStatus === "ACTIVE";
  const hasRecentEvents = lastEventTime && (Date.now() - lastEventTime < 30000);

  let globalStatus = "OFFLINE";
  let globalColor = "#ff3333";
  let globalBg = "rgba(255, 51, 51, 0.12)";
  let globalBorder = "1px solid rgba(255, 51, 51, 0.4)";

  if (isTiktokConnected && isTikfinityConnected && hasRecentEvents && liveInputActive) {
    globalStatus = "LIVE READY";
    globalColor = "#00ffcc";
    globalBg = "rgba(0, 255, 204, 0.12)";
    globalBorder = "1px solid rgba(0, 255, 204, 0.4)";
  } else if (!liveInputActive) {
    globalStatus = "LIVE INPUT OFF";
    globalColor = "#ffaa00";
    globalBg = "rgba(255, 170, 0, 0.12)";
    globalBorder = "1px solid rgba(255, 170, 0, 0.4)";
  } else if (isTiktokConnected || isTikfinityConnected) {
    globalStatus = "DEGRADED";
    globalColor = "#ffd700";
    globalBg = "rgba(255, 215, 0, 0.12)";
    globalBorder = "1px solid rgba(255, 215, 0, 0.4)";
  }

  if (onStatusChange) {
    onStatusChange(globalStatus);
  }

  const handleToggleConnect = async () => {
    if (isTiktokConnected) {
      setIsConnecting(true);
      await tikTokConnector.disconnect();
      setIsConnecting(false);
    } else {
      setIsConnecting(true);
      try {
        await tikTokConnector.connect({ mode: "REAL_TIKTOK" });
      } catch (e) {
        await tikTokConnector.connect({ mode: "MOCK_TIKTOK" });
      }
      setIsConnecting(false);
    }
  };

  const handleToggleLiveInput = () => {
    if (liveInputActive) {
      giftEventBridge.disableLiveInput();
    } else {
      giftEventBridge.enableLiveInput();
    }
  };

  return (
    <div style={{
      display: "flex",
      flexWrap: "wrap",
      justifyContent: "space-between",
      alignItems: "center",
      background: globalBg,
      border: globalBorder,
      borderRadius: "10px",
      padding: "10px 16px",
      marginBottom: "16px",
      boxShadow: `0 0 20px ${globalColor}25`,
      transition: "all 0.3s ease"
    }}>
      {/* Global Status Badge */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <div style={{
          fontSize: "14px",
          fontWeight: 900,
          color: globalColor,
          textTransform: "uppercase",
          letterSpacing: "1px",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          textShadow: `0 0 10px ${globalColor}80`
        }}>
          {globalStatus === "LIVE READY" ? "🟢 LIVE READY" : globalStatus === "LIVE INPUT OFF" ? "🟠 LIVE INPUT OFF" : globalStatus === "DEGRADED" ? "🟡 DEGRADED" : "🔴 OFFLINE / ERROR"}
        </div>
        <div style={{ fontSize: "11px", color: "#cbd5e0", fontWeight: 700 }}>
          {globalStatus === "LIVE READY" ? "Sistema listo para transmitir en vivo" : globalStatus === "LIVE INPUT OFF" ? "Entrada de regalos en vivo pausada (Kill Switch)" : "Comprobando conexiones y flujos"}
        </div>
      </div>

      {/* Individual Health Indicators & Controls */}
      <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ fontSize: "11px", display: "flex", alignItems: "center", gap: "4px" }}>
          <span>TikTok LIVE:</span>
          <span style={{ color: isTiktokConnected ? "#00ffcc" : "#ff3333", fontWeight: 800 }}>
            {isTiktokConnected ? "🟢 Connected" : "🔴 Disconnected"}
          </span>
        </div>

        <div style={{ fontSize: "11px", display: "flex", alignItems: "center", gap: "4px" }}>
          <span>TikFinity:</span>
          <span style={{ color: isTikfinityConnected ? "#00ffcc" : "#ffd700", fontWeight: 800 }}>
            {isTikfinityConnected ? "🟢 Connected" : "🟡 Waiting"}
          </span>
        </div>

        <div style={{ fontSize: "11px", display: "flex", alignItems: "center", gap: "4px" }}>
          <span>Event Stream:</span>
          <span style={{ color: hasRecentEvents ? "#00ffcc" : "#ffd700", fontWeight: 800 }}>
            {hasRecentEvents ? "🟢 Receiving" : "🟡 Waiting for events"}
          </span>
          <span style={{ fontSize: "9.5px", color: "#a0aec0" }}>({timeAgo})</span>
        </div>

        {/* Live Input Kill Switch Toggle Button */}
        <button
          onClick={handleToggleLiveInput}
          style={{
            background: liveInputActive ? "linear-gradient(135deg, #38a169, #2f855a)" : "linear-gradient(135deg, #e53e3e, #c53030)",
            color: "#ffffff",
            border: "none",
            padding: "6px 14px",
            borderRadius: "6px",
            fontSize: "11px",
            fontWeight: 900,
            cursor: "pointer",
            textTransform: "uppercase",
            letterSpacing: "0.8px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.4)"
          }}
        >
          {liveInputActive ? "🟢 LIVE INPUT: ON" : "🔴 LIVE INPUT: OFF"}
        </button>

        {/* Primary Connection Action Button */}
        <button
          onClick={handleToggleConnect}
          disabled={isConnecting}
          style={{
            background: isTiktokConnected ? "linear-gradient(135deg, #e53e3e, #c53030)" : "linear-gradient(135deg, #319795, #2b6cb0)",
            color: "#ffffff",
            border: "none",
            padding: "6px 14px",
            borderRadius: "6px",
            fontSize: "11px",
            fontWeight: 900,
            cursor: "pointer",
            textTransform: "uppercase",
            letterSpacing: "0.8px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.4)"
          }}
        >
          {isConnecting ? "⏳ CONNECTING..." : isTiktokConnected ? "🔌 DISCONNECT LIVE" : "🔌 CONNECT LIVE"}
        </button>
      </div>
    </div>
  );
}
