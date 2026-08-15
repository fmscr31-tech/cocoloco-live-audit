export const players = [];

// ==============================
// RESOLVER DE IDENTIDAD
// ==============================
// RegistrationManager uses playerId/tiktokId while playerManager uses its
// internal UUID in id. Scoring must accept either identity.
function findPlayerById(playerId) {
  if (!playerId) return null;
  return players.find(
    p => p.id === playerId || p.tiktokId === playerId || p.playerId === playerId
  ) || null;
}

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
    p => (tiktokId && p.tiktokId === tiktokId) || p.name.toLowerCase() === name.toLowerCase()
  );

  if (exists) {
    if (avatar && !exists.avatar) exists.avatar = avatar;
    if (tiktokId && !exists.tiktokId) exists.tiktokId = tiktokId;
    if (username && !exists.username) exists.username = username;
    return exists;
  }

  const newPlayer = {
    id: crypto.randomUUID(),
    name,
    displayName: name,
    username,
    avatar,
    tiktokId,
    teamId: null,
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
