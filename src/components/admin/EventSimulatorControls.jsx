import { useState } from "react";
import { eventBus } from "../../core/eventBus";

export function EventSimulatorControls() {
  const [displayName, setDisplayName] = useState("");
  const [playerId, setPlayerId] = useState("");
  const [message, setMessage] = useState("");
  const [feedback, setFeedback] = useState(null);

  const handleSendEvent = (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    const finalPlayerId = playerId.trim() || `user_${Math.floor(Math.random() * 90000 + 10000)}`;
    const finalDisplayName = displayName.trim() || `Viewer_${finalPlayerId}`;

    const eventPayload = {
      type: "CHAT",
      playerId: finalPlayerId,
      displayName: finalDisplayName,
      message: message.trim()
    };

    eventBus.publish("normalized:chat", eventPayload);
    console.log("[EventSimulator] Published normalized:chat:", eventPayload);

    setFeedback(`Evento CHAT enviado de ${finalDisplayName}: "${message}"`);
    setMessage("");

    setTimeout(() => {
      setFeedback(null);
    }, 3000);
  };

  return (
    <div style={{
      background: "rgba(25, 20, 38, 0.9)",
      border: "1px solid rgba(255, 255, 255, 0.15)",
      borderRadius: "10px",
      padding: "14px",
      boxShadow: "0 4px 15px rgba(0,0,0,0.4)"
    }}>
      <h3 style={{ margin: "0 0 10px 0", fontSize: "14px", color: "#00f5ff", textTransform: "uppercase", letterSpacing: "0.5px" }}>
        🧪 Simulador de Eventos (Event Bridge)
      </h3>

      <form onSubmit={handleSendEvent} style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <div>
          <label style={{ fontSize: "10px", color: "#a0aec0", display: "block", marginBottom: "2px" }}>
            Display Name:
          </label>
          <input
            type="text"
            placeholder="ej. Fernando"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            style={{
              width: "100%",
              background: "#120f1d",
              color: "white",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: "6px",
              padding: "5px",
              fontSize: "11px",
              boxSizing: "border-box"
            }}
          />
        </div>

        <div>
          <label style={{ fontSize: "10px", color: "#a0aec0", display: "block", marginBottom: "2px" }}>
            Player ID:
          </label>
          <input
            type="text"
            placeholder="ej. 123456"
            value={playerId}
            onChange={(e) => setPlayerId(e.target.value)}
            style={{
              width: "100%",
              background: "#120f1d",
              color: "white",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: "6px",
              padding: "5px",
              fontSize: "11px",
              boxSizing: "border-box"
            }}
          />
        </div>

        <div>
          <label style={{ fontSize: "10px", color: "#a0aec0", display: "block", marginBottom: "2px" }}>
            Message / Command:
          </label>
          <input
            type="text"
            placeholder="ej. !rojo"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            style={{
              width: "100%",
              background: "#120f1d",
              color: "white",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: "6px",
              padding: "5px",
              fontSize: "11px",
              boxSizing: "border-box"
            }}
          />
        </div>

        <button
          type="submit"
          style={{
            background: "linear-gradient(135deg, #00f5ff, #0099ff)",
            color: "#000",
            border: "none",
            padding: "8px",
            borderRadius: "6px",
            fontSize: "12px",
            fontWeight: 800,
            cursor: "pointer",
            marginTop: "4px"
          }}
        >
          Enviar Evento
        </button>

        {feedback && (
          <div style={{ fontSize: "10px", color: "#48bb78", fontWeight: 700, textAlign: "center", marginTop: "4px" }}>
            {feedback}
          </div>
        )}
      </form>
    </div>
  );
}
