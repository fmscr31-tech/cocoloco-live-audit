export function TeamManagement({ teamName, setTeamName, addTeam, teams }) {
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
      <div style={{display:"flex", flexWrap:"wrap", gap:"8px"}}>
        {teams.map(team=>(
          <div
            key={team.id}
            style={{
              background:"#120d24",
              padding:"6px 10px",
              borderRadius:"6px",
              border:"1px solid rgba(255,255,255,0.1)",
              fontSize:"12px",
              display:"flex",
              alignItems:"center",
              gap:"6px"
            }}
          >
            <span>{team.icon}</span>
            <span style={{fontWeight:700}}>{team.name}</span>
            <span style={{color:"#ffd700", marginLeft:"4px"}}>({team.points}pts)</span>
          </div>
        ))}
      </div>
    </div>
  );
}
