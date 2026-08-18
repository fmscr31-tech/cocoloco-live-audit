import { eventBus } from "./eventBus";
import { loadData, saveData } from "./storageManager";
import { setPlayers } from "./stateManager";

export const players = [];

const REGISTRATION_STORAGE_KEY = "cocoloco_registered_players_v2";
const PLAYER_STORAGE_KEY = "cocoloco_live_data";

function persistPlayers() {
  try {
    const current = loadData() || {};
    saveData({
      ...current,
      players: players.map(player => ({ ...player }))
    });
  } catch (error) {
    console.warn("[PlayerManager] Failed to persist players:", error);
  }
}

function publishPlayersState() {
  try {
    setPlayers(players);
  } catch (error) {
    console.warn("[PlayerManager] Failed to publish players state:", error);
  }
}

function hydratePlayersFromStorage() {
  if (typeof localStorage === "undefined") return;

  try {
    const data = loadData();
    if (!data || !Array.isArray(data.players) || data.players.length === 0) return;

    data.players.forEach(source => {
      if (!source || !source.id) return;
      if (players.some(player => player.id === source.id)) return;
      players.push({
        ...source,
        points: Number.isFinite(Number(source.points)) ? Number(source.points) : 0,
        wins: Number.isFinite(Number(source.wins)) ? Number(source.wins) : 0,
        wordsFound: Number.isFinite(Number(source.wordsFound)) ? Number(source.wordsFound) : 0,
        updatedAt: source.updatedAt || Date.now()
      });
    });

    publishPlayersState();
    console.log("[PlayerManager] Restored persisted players:", players.length);
  } catch (error) {
    console.warn("[PlayerManager] Failed to restore players:", error);
  }
}

hydratePlayersFromStorage();

function findLocalPlayerById(playerId) {
  if (!playerId) return null;
  return players.find(
    p => p.id === playerId || p.tiktokId === playerId || p.playerId === playerId
  ) || null;
}

function hydrateRegisteredPlayer(playerId) {
  if (!playerId || typeof localStorage === "undefined") return null;

  try {
    const raw = localStorage.getItem(REGISTRATION_STORAGE_KEY);
    if (!raw) return null;

    const registered = JSON.parse(raw);
    if (!Array.isArray(registered)) return null;

    const source = registered.find(
      p => p && (p.playerId === playerId || p.id === playerId || p.username === playerId)
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

eventBus.subscribe("game:score_updated", (payload) => {
  const snapshot = payload?.playerSnapshot;
  if (!snapshot || !snapshot.id) return;

  const existing = findLocalPlayerById(snapshot.id) ||
    (snapshot.tiktokId ? findLocalPlayerById(snapshot.tiktokId) : null) ||
    (snapshot.playerId ? findLocalPlayerById(snapshot.playerId) : null);

  if (existing) Object.assign(existing, snapshot, { updatedAt: Date.now() });
  else players.push({ ...snapshot, updatedAt: Date.now() });

  publishPlayersState();
  persistPlayers();
  console.log("[PlayerManager] Score snapshot synchronized:", snapshot);
});

eventBus.subscribe("players:reset", (payload) => {
  const removedCount = players.length;
  players.length = 0;
  publishPlayersState();
  persistPlayers();
  console.log("[PlayerManager] Round player reset synchronized:", {
    removedCount,
    reason: payload?.reason || "ROUND_FINISHED"
  });
});

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
    let changed = false;
    if (avatar && !exists.avatar) { exists.avatar = avatar; changed = true; }
    if (tiktokId && !exists.tiktokId) { exists.tiktokId = tiktokId; changed = true; }
    if (username && !exists.username) { exists.username = username; changed = true; }
    if (input && typeof input === "object" && input.teamId && !exists.teamId) { exists.teamId = input.teamId; changed = true; }
    if (changed) {
      exists.updatedAt = Date.now();
      publishPlayersState();
      persistPlayers();
    }
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
  publishPlayersState();
  persistPlayers();
  eventBus.emit("player:created", { player: { ...newPlayer } });
  console.log("[PlayerManager] Player identity stored:", newPlayer);
  return newPlayer;
}

export function removePlayer(playerId) {
  const index = players.findIndex(
    p => p.id === playerId || p.tiktokId === playerId || p.playerId === playerId
  );
  if (index === -1) return null;
  const removed = players.splice(index, 1)[0];
  publishPlayersState();
  persistPlayers();
  eventBus.emit("player:updated", { player: { ...removed, removed: true } });
  return removed;
}

export function addWin(playerId, options = {}) {
  const player = findPlayerById(playerId);
  if (!player) {
    console.warn("[PlayerManager] addWin: player not found for identity:", playerId);
    return null;
  }

  player.wins++;
  player.wordsFound++;
  player.points += 1;
  player.streak++;
  player.updatedAt = Date.now();

  publishPlayersState();
  persistPlayers();

  // gameEngine emits the canonical score event after it also updates the team.
  // Keeping this event optional prevents duplicate overlay renders/flicker.
  if (options.emitScoreEvent !== false) {
    eventBus.emit("game:score_updated", {
      playerId: player.id,
      username: player.name,
      teamId: player.teamId || null,
      pointsAdded: 1,
      newTotal: player.points,
      source: "WIN_LIMPIA",
      timestamp: Date.now(),
      playerSnapshot: { ...player }
    });
  }

  return player;
}

export function addPoints(playerId, points = 1) {
  const player = findPlayerById(playerId);
  if (!player) {
    console.warn("[PlayerManager] addPoints: player not found for identity:", playerId);
    return null;
  }

  const delta = Number(points);
  if (!Number.isFinite(delta) || delta === 0) return player;

  const previousPoints = Number(player.points) || 0;
  player.points = Math.max(0, previousPoints + delta);
  player.updatedAt = Date.now();

  publishPlayersState();
  persistPlayers();

  eventBus.emit("game:score_updated", {
    playerId: player.id,
    username: player.name,
    pointsAdded: player.points - previousPoints,
    newTotal: player.points,
    source: delta < 0 ? "MANUAL_REMOVE" : "POINTS",
    timestamp: Date.now(),
    playerSnapshot: { ...player }
  });

  return player;
}

export function assignTeam(playerId, teamId) {
  const player = findPlayerById(playerId);
  if (!player) return null;
  if (player.teamId && player.teamId !== teamId) return player;
  player.teamId = teamId;
  player.updatedAt = Date.now();
  publishPlayersState();
  persistPlayers();
  return player;
}

export function removeTeam(playerId) {
  const player = findPlayerById(playerId);
  if (!player) return null;
  player.teamId = null;
  player.updatedAt = Date.now();
  publishPlayersState();
  persistPlayers();
  return player;
}

export function setAvatar(playerId, avatar) {
  const player = findPlayerById(playerId);
  if (!player) return null;
  player.avatar = avatar;
  player.updatedAt = Date.now();
  persistPlayers();
  publishPlayersState();
  return player;
}

export function getPlayer(playerId) { return findPlayerById(playerId); }
export function getPlayerByName(name) { return players.find(p => p.name.toLowerCase() === name.toLowerCase()); }
export function getPlayers() { return [...players]; }

export function getLeaderboard() {
  return [...players].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    return b.wins - a.wins;
  });
}

export function resetPlayers() {
  players.length = 0;
  publishPlayersState();
  persistPlayers();
}

export function clearPlayers() {
  resetPlayers();
}

export function resetRoundScores() {
  players.forEach(p => {
    p.points = 0;
    p.wins = 0;
    p.updatedAt = Date.now();
  });
  publishPlayersState();
  persistPlayers();
}
