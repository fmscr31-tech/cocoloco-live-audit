export default function BattlePanel({
  battle,
  battleName,
  setBattleName,
  createNewBattle,
  beginBattle,
  endBattle
}) {
  return (
    <>
      <hr />

      <h3>
        🎮 Nueva Batalla
      </h3>

      <input
        value={battleName}
        onChange={(e) => setBattleName(e.target.value)}
        placeholder="Nombre batalla"
      />

      <button onClick={createNewBattle}>
        Crear Batalla
      </button>

      {battle && (
        <div
          style={{
            marginTop: "20px",
            padding: "15px",
            background: "#262d4d",
            borderRadius: "12px"
          }}
        >
          <h3>
            🥥 Batalla Actual
          </h3>

          <p>
            <strong>Nombre:</strong> {battle.name}
          </p>

          <p>
            <strong>Estado:</strong> {battle.status}
          </p>

          <p>
            <strong>Participantes:</strong>{" "}
            {battle.players ? battle.players.length : 0}
          </p>

          <div
            style={{
              display: "flex",
              gap: "10px",
              marginTop: "15px"
            }}
          >
            <button onClick={beginBattle}>
              ▶ Iniciar Batalla
            </button>

            <button onClick={endBattle}>
              ⏹ Finalizar Batalla
            </button>
          </div>
        </div>
      )}
    </>
  );
}