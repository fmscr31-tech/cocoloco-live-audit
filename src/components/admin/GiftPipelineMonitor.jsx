import { useState, useEffect } from "react";
import { eventBus } from "../../core/eventBus";
import { GiftImage } from "../common/GiftImage";

export function GiftPipelineMonitor() {
  const [logs, setLogs] = useState([]);
  const [lastGift, setLastGift] = useState(null);

  useEffect(() => {
    const unsub = eventBus.subscribe("gift:action_dispatched", (data) => {
      const entry = {
        id: Date.now() + Math.random(),
        timestamp: new Date().toLocaleTimeString(),
        resolvedAction: data.resolvedAction,
        result: data.result,
        rawEvent: data
      };
      setLastGift({
        giftId: data.resolvedAction?.gift?.id || data.giftId || "Unknown",
        giftName: data.resolvedAction?.gift?.name || data.giftName || "Unknown",
        quantity: data.resolvedAction?.quantity || data.quantity || 1,
        user: data.resolvedAction?.username || data.username || "Anonymous",
        eventId: data.eventId || `evt_${Date.now()}`,
        resolvedRule: data.resolvedAction?.rule || "Default Configured Rule",
        action: data.resolvedAction?.action || "Add points",
        points: data.resolvedAction?.value || 1,
        timestamp: new Date().toLocaleString()
      });
      setLogs(prev => [entry, ...prev].slice(0, 20)); // Keep last 20
    });

    const unsubReward = eventBus.subscribe("reward:processed", (e) => {
      setLastGift({
        giftId: e.giftId || "Unknown",
        giftName: e.giftName || "Unknown",
        quantity: e.quantity || 1,
        user: e.username || "Anonymous",
        eventId: e.eventId || `evt_${Date.now()}`,
        resolvedRule: e.rule || "Reward Processed Rule",
        action: e.action || "Add points",
        points: e.points || 1,
        timestamp: new Date().toLocaleString()
      });
    });

    return () => {
      unsub && unsub();
      unsubReward && unsubReward();
    };
  }, []);

  const handleClear = () => {
    setLogs([]);
    setLastGift(null);
  };

  return (
    <div style={{
      background: "rgba(25, 20, 38, 0.9)",
      border: "1px solid rgba(255, 255, 255, 0.15)",
      borderRadius: "10px",
      padding: "16px",
      boxShadow: "0 4px 15px rgba(0,0,0,0.4)",
      display: "flex",
      flexDirection: "column",
      gap: "12px"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ margin: 0, fontSize: "14px", color: "#00f5ff", textTransform: "uppercase", letterSpacing: "0.5px" }}>
          📡 Gift Pipeline Monitor & Last Received Gift Diagnostics
        </h3>
        <button
          onClick={handleClear}
          style={{
            background: "#4a5568",
            color: "#fff",
            border: "none",
            padding: "4px 10px",
            borderRadius: "6px",
            fontSize: "10px",
            fontWeight: 800,
            cursor: "pointer"
          }}
        >
          Limpiar Logs
        </button>
      </div>

      {/* LAST RECEIVED GIFT DIAGNOSTICS */}
      <div style={{
        background: "rgba(18, 15, 29, 0.95)",
        border: "1.5px solid #ffd700",
        borderRadius: "8px",
        padding: "12px",
        display: "flex",
        flexDirection: "column",
        gap: "6px",
        boxShadow: "0 0 15px rgba(255,215,0,0.2)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ width: "22px", height: "22px", display: "inline-block" }}>
            <GiftImage giftId={lastGift?.giftName || lastGift?.giftId} style={{ width: "22px", height: "22px" }} />
          </span>
          <div style={{ fontSize: "11px", fontWeight: 900, color: "#ffd700", textTransform: "uppercase", letterSpacing: "1px" }}>
            🎁 LAST RECEIVED GIFT
          </div>
        </div>
        {lastGift ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "6px", fontSize: "11px", color: "#e2e8f0" }}>
            <div><strong>Gift Identifier:</strong> <span style={{ color: "#00f5ff" }}>{lastGift.giftId}</span></div>
            <div><strong>Gift Name:</strong> <span style={{ color: "#fff" }}>{lastGift.giftName}</span></div>
            <div><strong>Quantity:</strong> <span style={{ color: "#ffd700" }}>{lastGift.quantity}</span></div>
            <div><strong>User:</strong> <span style={{ color: "#00ffcc" }}>{lastGift.user}</span></div>
            <div><strong>Event ID:</strong> <span style={{ color: "#a0aec0", fontFamily: "monospace" }}>{lastGift.eventId}</span></div>
            <div><strong>Resolved Rule:</strong> <span style={{ color: "#e2e8f0" }}>{lastGift.resolvedRule}</span></div>
            <div><strong>Action:</strong> <span style={{ color: "#00f5ff" }}>{lastGift.action}</span></div>
            <div><strong>Points:</strong> <span style={{ color: "#ffd700", fontWeight: 900 }}>+{lastGift.points}</span></div>
          </div>
        ) : (
          <div style={{ fontSize: "11px", color: "#718096", fontStyle: "italic", textAlign: "center", padding: "8px" }}>
            No gifts received yet in this live session. Real-time diagnostics will populate automatically when gifts arrive.
          </div>
        )}
      </div>

      <div style={{ fontSize: "11px", color: "#a0aec0" }}>
        Real-time monitoring of incoming gift events, resolver evaluations, and action dispatches.
      </div>

      <div style={{
        maxHeight: "180px",
        overflowY: "auto",
        background: "rgba(10, 8, 18, 0.8)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "6px",
        padding: "8px",
        display: "flex",
        flexDirection: "column",
        gap: "6px"
      }}>
        {logs.length === 0 ? (
          <div style={{ fontSize: "11px", color: "#718096", textAlign: "center", padding: "10px" }}>
            Waiting for gift events... Use Event Simulator or test utility to trigger gifts.
          </div>
        ) : (
          logs.map((log) => {
            const act = log.resolvedAction || {};
            const gift = act.gift || {};
            return (
              <div key={log.id} style={{
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid rgba(0, 245, 255, 0.2)",
                borderRadius: "6px",
                padding: "8px",
                fontSize: "11px",
                display: "flex",
                flexDirection: "column",
                gap: "2px"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontWeight: 800, color: "#ffd700" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ width: "16px", height: "16px", display: "inline-block" }}>
                      <GiftImage giftId={gift.name || gift.id || log.giftId} style={{ width: "16px", height: "16px" }} />
                    </span>
                    {gift.name || "Gift"} (x{act.value ? Math.round(act.value / (gift.baseValue || 1)) : 1})
                  </span>
                  <span style={{ color: "#a0aec0", fontSize: "10px" }}>{log.timestamp}</span>
                </div>
                <div style={{ color: "#e2e8f0" }}>
                  👤 <strong>{act.username}</strong> → Action: <span style={{ color: "#00f5ff" }}>{act.action}</span> (Value: <strong>+{act.value}</strong>, Team: {act.team})
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
