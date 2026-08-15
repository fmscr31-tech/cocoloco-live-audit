export function PlayerManagement({ name, setName, selectedTeam, setSelectedTeam, addPlayer, teams, players, getTeamName, addWin, deletePlayer }) {
  return (
    <div style={{background:"#261c3a", padding:"14px", borderRadius:"10px", border:"1px solid rgba(255,255,255,0.08)"}}>
      <h3 style={{fontSize:"15px", margin:"0 0 10px 0", color:"#ffd700"}}>👤 Participantes</h3>
      <div style={{display:"flex", gap:"8px", marginBottom:"12px"}}>
        <input
          value={name}
          onChange={e=>setName(e.target.value)}
          placeholder="Nickname TikTok"
          style={{flex:1, background:"#120d24", border:"1px solid rgba(255,255,255,0.2)", padding:"6px 10px", borderRadius:"6px", color:"white", fontSize:"13px"}}
        />
        <select
          value={selectedTeam}
          onChange={e=>setSelectedTeam(e.target.value)}
          style={{background:"#120d24", border:"1px solid rgba(255,255,255,0.2)", padding:"6px 10px", borderRadius:"6px", color:"white", fontSize:"13px"}}
        >
          <option value="">Sin equipo</option>
          {teams.map(team=>(
            <option key={team.id} value={team.id}>
              {team.icon} {team.name}
            </option>
          ))}
        </select>
        <button onClick={addPlayer} style={{background:"#48bb78", color:"white", border:"none", padding:"6px 12px", borderRadius:"6px", fontWeight:700, cursor:"pointer", fontSize:"13px"}}>
          ➕ Agregar
        </button>
      </div>

      <div style={{maxHeight:"260px", overflowY:"auto", display:"flex", flexDirection:"column", gap:"6px"}}>
        {players.map(player=>(
          <div
            key={player.id}
            style={{
              display:"flex",
              justifyContent:"space-between",
              alignItems:"center",
              background:"#120d24",
              padding:"8px 10px",
              borderRadius:"6px",
              border:"1px solid rgba(255,255,255,0.08)",
              fontSize:"13px"
            }}
          >
            <div>
              <span style={{fontWeight:700}}>{player.name}</span>
              {player.teamId && (
                <span style={{fontSize:"11px", color:"#00f5ff", marginLeft:"8px", background:"rgba(0,245,255,0.1)", padding:"2px 6px", borderRadius:"4px"}}>
                  {getTeamName(player.teamId)}
                </span>
              )}
              <span style={{fontSize:"11px", color:"#ffd700", marginLeft:"8px"}}>
                🏆 {player.wins}
              </span>
            </div>
            <div style={{display:"flex", gap:"6px"}}>
              <button
                onClick={()=>addWin(player.id)}
                style={{
                  background:"#ffd700",
                  color:"#000",
                  border:"none",
                  padding:"4px 10px",
                  borderRadius:"5px",
                  fontWeight:800,
                  cursor:"pointer",
                  fontSize:"11px"
                }}
              >
                +Win
              </button>
              <button
                onClick={()=>deletePlayer(player.id)}
                style={{
                  background:"#e53e3e",
                  color:"white",
                  border:"none",
                  padding:"4px 8px",
                  borderRadius:"5px",
                  fontWeight:800,
                  cursor:"pointer",
                  fontSize:"11px"
                }}
              >
                ❌
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
