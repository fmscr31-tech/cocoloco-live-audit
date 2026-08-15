import { eventBus } from "./eventBus";

export const players = [];

const REGISTRATION_STORAGE_KEY = "cocoloco_registered_players_v2";

// ==============================
// RESOLVER DE IDENTIDAD
// ==============================
// RegistrationManager uses playerId/tiktokId while playerManager uses its
// internal UUID in id. Scoring must accept either identity.
function findLocalPlayerById(playerId) {
  if (!playerId) return null;
  return players.find(
    p => p.id === playerId || p.tiktokId === playerId || p.playerId === playerId
  ) || null;
}

// A player can be registered in another browser window/tab while the current
// window has not yet materialized that identity in playerManager. Hydrate it
// from the shared registration storage before scoring.
function hydrateRegisteredPlayer(playerId) {
  if (!playerId || typeof localStorage === "undefined") return null;

  try {
    const raw = localStorage.getItem(REGISTRATION_STORAGE_KEY);
    if (!raw) return null;

    const registered = JSON.parse(raw);
    if (!Array.isArray(registered)) return null;

    const source = registered.find(
      p => p && (
        p.playerId === playerId ||
        p.id === playerId ||
        p.username === playerId
      )
    );

    if (!source) return null;

    return addPlayer({
      name: source.displayName || source.name || source.username || source.playerId,
      displayName: source.displayName || source.name || source.username || source.playerId,
      username: source.username || source.displayName || source.playerId,
      tiktokId: source.playerId || source.id || source.username,
      avatar: source.avatar || source.profilePictureUrl || "",
      teamId: source.teamId || null
    });
  } catch (error) {
    console.warn("[PlayerManager] Failed to hydrate registered player:", error);
    return null;
  }
}

function findPlayerById(playerId) {
  return findLocalPlayerById(playerId) || hydrateRegisteredPlayer(playerId);
}

// ==============================
// CROSS-WINDOW SCORE SYNC
// ==============================
// The Admin and Overlay run in separate browser contexts. A score event must
// carry the complete player snapshot so the receiving context can update its
// own in-memory player without incrementing twice.
eventBus.subscribe("game:score_updated", (payload) => {
  const snapshot = payload?.playerSnapshot;
  if (!snapshot || !snapshot.id) return;

  const existing = findLocalPlayerById(snapshot.id) ||
    (snapshot.tiktokId ? findLocalPlayerById(snapshot.tiktokId) : null) ||
    (snapshot.playerId ? findLocalPlayerById(snapshot.playerId) : null);

  if (existing) {
    Object.assign(existing, snapshot, { updatedAt: Date.now() });
  } else {
    players.push({ ...snapshot, updatedAt: Date.now() });
  }

  console.log("[PlayerManager] Score snapshot synchronized:", snapshot);
});

// ==============================
// CREAR JUGADOR
// ==============================
export function addPlayer(input) {
  const name = typeof input === "string" ? input : (input.displayName || input.name || input.username || "Anonymous");
  const tiktokId = typeof input === "object" && input !== null ? (input.tiktokId || input.playerId || "") : "";
  const username = typeof input === "object" && input !== null ? (input.username || input.displayName || name) : name;
  const avatar = typeof input === "object" && input !== null ? (
    input.avatar || input.profilePictureUrl || input.profilePicture ||
    (Array.isArray(input.profilePictureUrls) ? input.profilePictureUrls[0] : null) ||
    input.payload?.profilePictureUrl || input.payload?.data?.profilePictureUrl || ""
  ) : "";

  const exists = players.find(
    p => (tiktokId && (p.tiktokId === tiktokId || p.playerId === tiktokId)) ||
      p.name.toLowerCase() === name.toLowerCase()
  );

  if (exists) {
    if (avatar && !exists.avatar) exists.avatar = avatar;
    if (tiktokId && !exists.tiktokId) exists.tiktokId = tiktokId;
    if (username && !exists.username) exists.username = username;
    if (input && typeof input === "object" && input.teamId && !exists.teamId) exists.teamId = input.teamId;
    return exists;
  }

  const newPlayer = {
    id: crypto.randomUUID(),
    name,
    displayName: name,
    username,
    avatar,
    tiktokId,
    teamId: typeof input === "object" && input !== null ? (input.teamId || null) : null,
    points: 0,
    wins: 0,
    wordsFound: 0,
    roundsPlayed: 0,
    battlesPlayed: 0,
    gifts: 0,
    streak: 0,
    online: true,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  players.push(newPlayer);
  console.log("[PlayerManager] Player identity stored:", newPlayer);
  return newPlayer;
}

// ==============================
// REMOVER JUGADOR
// ==============================
export function removePlayer(playerId) {
  const index = players.findIndex(
    p => p.id === playerId || p.tiktokId === playerId || p.playerId === playerId
  );
  if (index === -1) return null;
  return players.splice(index, 1)[0];
}

// ==============================
// VICTORIA DE JUGADOR (WIN LIMPIA)
// ==============================
export function addWin(playerId) {
  const player = findPlayerById(playerId);
  if (!player) {
    console.warn("[PlayerManager] addWin: player not found for identity:", playerId);
    return null;
  }

  player.wins++;
  player.wordsFound++;
  // WIN LIMPIA: exactamente +1 punto por adivinar correctamente.
  player.points += 1;
  player.streak++;
  player.updatedAt = Date.now();

  eventBus.emit("game:score_updated", {
    playerId: player.id,
    username: player.name,
    pointsAdded: 1,
    newTotal: player.points,
    source: "WIN_LIMPIA",
    timestamp: Date.now(),
    playerSnapshot: { ...player }
  });

  return player;
}

// ==============================
// SUMAR PUNTOS (GIFT / MANUAL)
// ==============================
export function addPoints(playerId, points = 1) {
  const player = findPlayerById(playerId);
  if (!player) {
    console.warn("[PlayerManager] addPoints: player not found for identity:", playerId);
    return null;
  }

  player.points += points;
  player.updatedAt = Date.now();

  eventBus.emit("game:score_updated", {
    playerId: player.id,
    username: player.name,
    pointsAdded: points,
    newTotal: player.points,
    source: "POINTS",
    timestamp: Date.now(),
    playerSnapshot: { ...player }
  });

  return player;
}

// ==============================
// ASIGNAR EQUIPO
// ==============================
export function assignTeam(playerId, teamId) {
  const player = findPlayerById(playerId);
  if (!player) return null;
  if (player.teamId && player.teamId !== teamId) return player;
  player.teamId = teamId;
  player.updatedAt = Date.now();
  return player;
}

// ==============================
// REMOVER EQUIPO
// ==============================
export function removeTeam(playerId) {
  const player = findPlayerById(playerId);
  if (!player) return null;
  player.teamId = null;
  player.updatedAt = Date.now();
  return player;
}

// ==============================
// AVATAR
// ==============================
export function setAvatar(playerId, avatar) {
  const player = findPlayerById(playerId);
  if (!player) return null;
  player.avatar = avatar;
  player.updatedAt = Date.now();
  return player;
}

// ==============================
// BUSCAR JUGADOR
// ==============================
export function getPlayer(playerId) {
  return findPlayerById(playerId);
}

export function getPlayerByName(name) {
  return players.find(p => p.name.toLowerCase() === name.toLowerCase());
}

// ==============================
// TODOS LOS JUGADORES
// ==============================
export function getPlayers() {
  return [...players];
}

// ==============================
// RANKING
// ==============================
export function getLeaderboard() {
  return [...players].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    return b.wins - a.wins;
  });
}

// ==============================
// RESET
// ==============================
export function resetPlayers() {
  players.length = 0;
}

export function resetRoundScores() {
  players.forEach(p => {
    p.points = 0;
    p.wins = 0;
    p.updatedAt = Date.now();
  });
}
