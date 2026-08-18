import { useState } from "react";
import { commandConfigManager } from "../../core/commandConfigManager";

export function TeamManagement({ teamName, setTeamName, addTeam, teams }) {
  const [editingNames, setEditingNames] = useState({});

  const renameConfiguredTeam = (team, value) => {
    const nextName = String(value || "").trim();
    if (!nextName || nextName === team.name) return;

    const current = commandConfigManager.getConfig();
    const duplicate = (current.teams || []).some(
      candidate => String(candidate.id) !== String(team.id) && String(candidate.name || "").trim().toLowerCase() === nextName.toLowerCase()
    );
    if (duplicate) {
      setEditingNames(prev => ({ ...prev, [team.id]: team.name }));
      return;
    }

    const updatedTeams = (current.teams || []).map(candidate =>
      String(candidate.id) === String(team.id) ? { ...candidate, name: nextName } : candidate
    );
    const result = commandConfigManager.updateFullConfig({ ...current, teams: updatedTeams });

    if (result?.success !== false) {
      try {
        const stored = JSON.parse(localStorage.getItem("cocoloco_teams") || "[]");
        const synced = stored.map(candidate => String(candidate.id) === String(team.id) ? { ...candidate, name: nextName } : candidate);
        if (synced.length) localStorage.setItem("cocoloco_teams", JSON.stringify(synced));
      } catch {}
      setEditingNames(prev => ({ ...prev, [team.id]: nextName }));
    } else {
      setEditingNames(prev => ({ ...prev, [team.id]: team.name }));
    }
  };

  return (
    <div style={{background:"#261c3a", padding:"14px", borderRadius:"10px", border:"1px solid rgba(255,255,255,0.08)"}}>
      <h3 style={{fontSize:"15px", margin:"0 0 10px 0", color:"#ffd700"}}>👥 Equipos</h3>
      <div style={{display:"flex", gap:"8px", marginBottom:"10px"}}>
        <input
          value={teamName}
          onChange={e=>setTeamName(e.target.value)}
          placeholder="Nombre equipo"
          style={{flex:1, background:"#120d24", border:"1px solid rgba(255,255,255,0.2)", padding:"6px 10px", borderRadius:"6px", color:"white", fontSize:"13px"}}
        />
        <button onClick={addTeam} style={{background:"#00bfff", color:"white", border:"none", padding:"6px 12px", borderRadius:"6px", fontWeight:700, cursor:"pointer", fontSize:"13px"}}>
          ➕ Crear
        </button>
      </div>

      <div style={{display:"flex", flexDirection:"column", gap:"8px"}}>
        {teams.map(team=>{
          const displayName = editingNames[team.id] ?? team.name;
          return (
            <div key={team.id} style={{background:"#120d24", padding:"8px 10px", borderRadius:"6px", border:"1px solid rgba(255,255,255,0.1)", fontSize:"12px"}}>
              <div style={{display:"flex", alignItems:"center", gap:"7px"}}>
                <span>{team.icon}</span>
                <input
                  value={displayName}
                  onChange={e=>setEditingNames(prev=>({ ...prev, [team.id]: e.target.value }))}
                  onBlur={e=>renameConfiguredTeam(team, e.target.value)}
                  onKeyDown={e=>{ if(e.key === "Enter") { e.currentTarget.blur(); } }}
                  aria-label={`Nombre del equipo ${team.id}`}
                  style={{flex:1, minWidth:0, background:"#0c091a", color:"white", border:`1px solid ${team.color || "rgba(255,255,255,.2)"}`, borderRadius:"5px", padding:"5px 7px", fontSize:"12px", fontWeight:800}}
                />
                <span style={{color:"#ffd700", whiteSpace:"nowrap"}}>({team.points}pts)</span>
              </div>
              <div style={{fontSize:"9px", color:"#718096", marginTop:"4px"}}>✏️ Edita el nombre • Enter o salir del campo para guardar</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
