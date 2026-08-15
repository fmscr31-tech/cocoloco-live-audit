export function PowerUpFeed({ activePowerUps }) {
  if (!activePowerUps || activePowerUps.length === 0) return null;

  return (
    <div className="battle-alert" style={{top: "70px", background: "rgba(128, 90, 213, 0.95)", border: "2px solid #ffffff", color: "#fff"}}>
      <div style={{fontSize: "13px", fontWeight: "900"}}>⚡ POWER-UP ACTIVO</div>
      {activePowerUps.map(p => (
        <div key={p.id} style={{fontSize: "12px", fontWeight: "800", marginTop: "2px"}}>
          {p.powerId.toUpperCase()} ({p.username})
        </div>
      ))}
    </div>
  );
}
