import { useState, useEffect } from "react";
import { tikTokConnector } from "../../core/connectors/tiktokConnector";
import { TIKTOK_CONFIG } from "../../config/tiktok";

export function TikTokConnectorControl() {
  const [username, setUsername] = useState(TIKTOK_CONFIG.username);
  const [mode, setMode] = useState(TIKTOK_CONFIG.mode);
  const [status, setStatus] = useState("DISCONNECTED");

  useEffect(() => {
    const interval = setInterval(() => {
      setStatus(tikTokConnector.getStatus().status);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleConnect = async () => {
    try {
      setStatus("CONNECTING");
      TIKTOK_CONFIG.username = username;
      TIKTOK_CONFIG.mode = mode;
      await tikTokConnector.connect(TIKTOK_CONFIG);
      setStatus(tikTokConnector.getStatus().status);
    } catch (e) {
      setStatus("ERROR");
    }
  };

  const handleDisconnect = async () => {
    await tikTokConnector.disconnect();
    setStatus("DISCONNECTED");
  };

  return (
    <div style={{background:"#261c3a", padding:"14px", borderRadius:"10px", border:"1px solid rgba(255,255,255,0.08)", marginTop:"16px"}}>
      <h3 style={{fontSize:"15px", margin:"0 0 10px 0", color:"#00f5ff"}}>🎥 TikTok LIVE Connector</h3>
      
      <div style={{display:"flex", gap:"8px", marginBottom:"10px", flexWrap:"wrap"}}>
        <input
          value={username}
          onChange={e=>setUsername(e.target.value)}
          placeholder="TikTok Creator Username"
          style={{flex:1, minWidth:"140px", background:"#120d24", border:"1px solid rgba(255,255,255,0.2)", padding:"6px 10px", borderRadius:"6px", color:"white", fontSize:"13px"}}
        />
        <select
          value={mode}
          onChange={e=>setMode(e.target.value)}
          style={{background:"#120d24", border:"1px solid rgba(255,255,255,0.2)", padding:"6px 10px", borderRadius:"6px", color:"white", fontSize:"13px"}}
        >
          <option value="MOCK_TIKTOK">Mock Mode</option>
          <option value="REAL_TIKTOK">Real WebSocket Bridge</option>
        </select>
      </div>

      <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"8px"}}>
        <div style={{fontSize:"12px", color:"#a0aec0"}}>
          Estado: <span style={{fontWeight:800, color: status === "CONNECTED" ? "#48bb78" : status === "ERROR" ? "#e53e3e" : "#ffd700"}}>{status}</span>
        </div>
        <div style={{display:"flex", gap:"6px"}}>
          {status !== "CONNECTED" ? (
            <button onClick={handleConnect} style={{background:"#3182ce", color:"white", border:"none", padding:"6px 12px", borderRadius:"6px", fontWeight:700, cursor:"pointer", fontSize:"12px"}}>
              Conectar
            </button>
          ) : (
            <button onClick={handleDisconnect} style={{background:"#e53e3e", color:"white", border:"none", padding:"6px 12px", borderRadius:"6px", fontWeight:700, cursor:"pointer", fontSize:"12px"}}>
              Desconectar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
