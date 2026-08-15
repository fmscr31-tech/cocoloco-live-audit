import { useEffect, useState } from "react";
import { eventMonitor } from "../../core/connectors/eventMonitor";
import { connectorManager } from "../../core/connectors/connectorManager";
import { dashboardAPI } from "../../core/dashboardAPI";

export function ConnectorMonitor() {
  const [stats, setStats] = useState(eventMonitor.getStats());
  const [recentEvents, setRecentEvents] = useState(eventMonitor.getRecentEvents(5));
  const [connectorStatuses, setConnectorStatuses] = useState(connectorManager.getStatusAll());

  useEffect(() => {
    const unsubscribe = dashboardAPI.subscribe(() => {
      setStats(eventMonitor.getStats());
      setRecentEvents(eventMonitor.getRecentEvents(5));
      setConnectorStatuses(connectorManager.getStatusAll());
    });

    const interval = setInterval(() => {
      setStats(eventMonitor.getStats());
      setRecentEvents(eventMonitor.getRecentEvents(5));
      setConnectorStatuses(connectorManager.getStatusAll());
    }, 1000);

    return () => {
      unsubscribe && unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const handleToggleConnect = async (name) => {
    const conn = connectorManager.getConnector(name);
    if (!conn) return;
    if (conn.status === "CONNECTED") {
      await conn.disconnect();
    } else {
      await conn.connect();
    }
    setConnectorStatuses(connectorManager.getStatusAll());
  };

  const getStatusColor = (status) => {
    switch ((status || "").toUpperCase()) {
      case "CONNECTED":
        return "#48bb78";
      case "RECONNECTING":
        return "#d69e2e";
      case "ERROR":
        return "#e53e3e";
      case "DISCONNECTED":
      default:
        return "#718096";
    }
  };

  return (
    <div style={{background:"#261c3a", padding:"14px", borderRadius:"10px", border:"1px solid rgba(255,255,255,0.08)", marginTop:"16px"}}>
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"10px"}}>
        <h3 style={{fontSize:"15px", margin:0, color:"#ffd700"}}>📡 Monitor de Conectores & Eventos</h3>
        <button onClick={() => { eventMonitor.clearHistory(); setStats(eventMonitor.getStats()); setRecentEvents([]); }} style={{background:"#e53e3e", color:"white", border:"none", padding:"4px 8px", borderRadius:"4px", fontSize:"10px", fontWeight:700, cursor:"pointer"}}>
          Limpiar
        </button>
      </div>

      {/* Connector Statuses */}
      <div style={{display:"flex", gap:"8px", marginBottom:"12px", flexWrap:"wrap"}}>
        {Object.entries(connectorStatuses).map(([name, info]) => (
          <div key={name} style={{background:"#120d24", padding:"6px 10px", borderRadius:"6px", border:"1px solid rgba(255,255,255,0.1)", display:"flex", alignItems:"center", gap:"8px", fontSize:"12px"}}>
            <span style={{textTransform:"uppercase", fontWeight:700, color:"#00f5ff"}}>{name}</span>
            <span style={{padding:"2px 6px", borderRadius:"4px", fontSize:"10px", fontWeight:800, background: getStatusColor(info.status), color:"white"}}>
              {info.status || "DISCONNECTED"}
            </span>
            <button onClick={() => handleToggleConnect(name)} style={{background:"#4a5568", color:"white", border:"none", padding:"2px 6px", borderRadius:"4px", fontSize:"10px", cursor:"pointer"}}>
              {info.status === "CONNECTED" ? "Desconectar" : "Conectar"}
            </button>
          </div>
        ))}
      </div>

      {/* Event Counters Grid */}
      <div style={{display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:"6px", marginBottom:"12px"}}>
        {Object.entries(stats.counts).map(([type, count]) => (
          <div key={type} style={{background:"#120d24", padding:"6px", borderRadius:"6px", textAlign:"center", border:"1px solid rgba(255,255,255,0.05)"}}>
            <div style={{fontSize:"10px", color:"#a0aec0", fontWeight:700}}>{type}</div>
            <div style={{fontSize:"16px", fontWeight:800, color:"#ffd700"}}>{count}</div>
          </div>
        ))}
      </div>

      {/* Recent Events List */}
      <div style={{fontSize:"12px", fontWeight:700, marginBottom:"6px", color:"#00f5ff"}}>Últimos Eventos Recibidos:</div>
      <div style={{maxHeight:"120px", overflowY:"auto", display:"flex", flexDirection:"column", gap:"4px"}}>
        {recentEvents.length === 0 ? (
          <div style={{fontSize:"11px", color:"#a0aec0", fontStyle:"italic"}}>Sin eventos registrados aún.</div>
        ) : (
          recentEvents.map((ev, idx) => (
            <div key={idx} style={{background:"#120d24", padding:"6px 8px", borderRadius:"4px", fontSize:"11px", display:"flex", justifyContent:"space-between", border:"1px solid rgba(255,255,255,0.04)"}}>
              <div>
                <span style={{color:"#00f5ff", fontWeight:700}}>[{ev.type}]</span> <span style={{fontWeight:600}}>{ev.username}</span>
              </div>
              <div style={{color:"#a0aec0", fontSize:"10px"}}>
                {new Date(ev.loggedAt).toLocaleTimeString()}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
