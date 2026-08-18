import { sessionManager } from "./sessionManager";
import { getPlayer } from "./playerManager";

const STORAGE_KEY = "cocoloco_mvp_leaderboard_v2";
let state = { sessionId: null, players: {} };

function getSessionId() {
  return sessionManager.getSession?.()?.sessionId || null;
}

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (saved && typeof saved === "object") {
      state = { sessionId: saved.sessionId || null, players: saved.players || {} };
    }
  } catch (e) {}

  const sessionId = getSessionId();
  if (sessionId && state.sessionId && String(sessionId) !== String(state.sessionId)) {
    state = { sessionId, players: {} };
  }
  if (sessionId && !state.sessionId) state.sessionId = sessionId;
}

function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
}

load();

function normalizeIdentity(item = {}) {
  const player = item?.player || item;
  const id = player?.id || player?.playerId || player?.tiktokId || player?.username || "";
  const playerId = player?.playerId || player?.tiktokId || "";
  const tiktokId = player?.tiktokId || player?.playerId || "";
  const username = player?.username || player?.uniqueId || "";
  return {
    id: id ? String(id) : "",
    playerId: playerId ? String(playerId) : "",
    tiktokId: tiktokId ? String(tiktokId) : "",
    username: username ? String(username).toLowerCase() : ""
  };
}

function canonicalPlayerKey(item = {}) {
  const identity = normalizeIdentity(item);
  if (identity.tiktokId) return identity.tiktokId;
  if (identity.playerId) return identity.playerId;
  if (identity.id) return identity.id;
  if (identity.username) return identity.username;
  return "";
}

function findExistingPlayer(item = {}) {
  const identity = normalizeIdentity(item);
  const lookupKeys = [identity.tiktokId, identity.playerId, identity.id, identity.username].filter(Boolean);
  for (const key of lookupKeys) if (state.players[key]) return state.players[key];
  return Object.values(state.players).find(entry => {
    const entryIdentity = normalizeIdentity(entry);
    const entryKeys = [entryIdentity.tiktokId, entryIdentity.playerId, entryIdentity.id, entryIdentity.username].filter(Boolean);
    return lookupKeys.some(key => entryKeys.includes(key));
  }) || null;
}

function ensurePlayer(item) {
  if (!item) return null;
  const identity = normalizeIdentity(item);
  let existing = findExistingPlayer(item);
  const key = canonicalPlayerKey(item);
  if (!key && !existing) return null;

  if (!existing) {
    existing = {
      playerId: identity.playerId || key,
      id: identity.id || key,
      tiktokId: identity.tiktokId || "",
      username: identity.username || "",
      name: item.name || item.displayName || item.username || "Jugador",
      teamId: item.teamId || null,
      mvpRounds: 0,
      winRounds: 0,
      giftRounds: 0,
      contributionPoints: 0,
      _contributionKeys: []
    };
  }

  existing.playerId = existing.playerId || identity.playerId || key;
  existing.id = existing.id || identity.id || key;
  existing.tiktokId = existing.tiktokId || identity.tiktokId || "";
  existing.username = existing.username || identity.username || "";
  existing.name = item.name || item.displayName || item.username || existing.name || "Jugador";
  existing.teamId = item.teamId || existing.teamId || null;
  existing._contributionKeys = Array.isArray(existing._contributionKeys) ? existing._contributionKeys : [];

  const stableKey = canonicalPlayerKey(existing);
  if (stableKey) {
    const oldKey = Object.keys(state.players).find(k => state.players[k] === existing);
    if (oldKey && oldKey !== stableKey) delete state.players[oldKey];
    state.players[stableKey] = existing;
  } else if (key) state.players[key] = existing;
  return existing;
}

export function recordMvpContribution({ player, source = "WIN_LIMPIA", points = 1, roundId = null } = {}) {
  if (!player) return null;
  load();
  const sourcePlayer = player?.id ? (getPlayer(player.id) || player) : player;
  const existing = ensurePlayer(sourcePlayer);
  if (!existing) return null;

  const contributionKey = `${roundId || "manual"}:${source}:${canonicalPlayerKey(existing)}`;
  if (existing._contributionKeys.includes(contributionKey)) return { ...existing };

  existing._contributionKeys.push(contributionKey);
  existing.contributionPoints = Number(existing.contributionPoints || 0) + Math.max(0, Number(points) || 0);
  if (source === "WIN_LIMPIA") existing.winRounds = Number(existing.winRounds || 0) + 1;
  if (source === "GIFT") existing.giftRounds = Number(existing.giftRounds || 0) + 1;
  if (roundId) existing.mvpRounds = Number(existing.mvpRounds || 0) + 1;
  save();
  return { ...existing };
}

export function recordRoundMvp(round) {
  load();
  const contributions = round?.contributions || {};
  const mvp = round?.mvp;
  const candidates = [];
  if (contributions.winLimpia?.playerId) candidates.push({ player: contributions.winLimpia, source: "WIN_LIMPIA", points: Number(contributions.winLimpia.points) || 1 });
  if (contributions.gift?.playerId) candidates.push({ player: contributions.gift, source: "GIFT", points: 1 });
  if (!candidates.length && mvp?.id) candidates.push({ player: mvp, source: mvp.source || "TOP_SCORE", points: Number(mvp.points) || 0 });
  if (!candidates.length) return null;

  const sessionId = getSessionId();
  if (sessionId && state.sessionId && String(sessionId) !== String(state.sessionId)) state = { sessionId, players: {} };
  if (sessionId && !state.sessionId) state.sessionId = sessionId;

  let last = null;
  for (const item of candidates) {
    const recorded = recordMvpContribution({ player: item.player, source: item.source, points: item.points, roundId: round?.id || null });
    if (recorded) last = recorded;
  }
  save();
  return last;
}

export function getMvpLeaderboard() {
  // Overlay and Admin are separate browser contexts. Always reload the persisted
  // canonical leaderboard before reading it; otherwise the overlay kept a stale
  // in-memory snapshot even though the attribution had already been saved.
  load();
  return Object.values(state.players)
    .sort((a, b) => Number(b.contributionPoints || 0) - Number(a.contributionPoints || 0) || Number(b.mvpRounds || 0) - Number(a.mvpRounds || 0))
    .map((p, index) => ({ ...p, rank: index + 1 }));
}

function resolvePlayerRecord(playerId) {
  load();
  if (playerId == null || playerId === "") return null;
  const lookup = String(playerId);
  if (state.players[lookup]) return state.players[lookup];
  const direct = findExistingPlayer({ id: lookup, playerId: lookup, tiktokId: lookup, username: lookup });
  if (direct) return direct;
  const gamePlayer = getPlayer(lookup);
  if (gamePlayer) {
    const resolved = findExistingPlayer(gamePlayer);
    if (resolved) return resolved;
  }
  return null;
}

export function getPlayerMvpRounds(playerId) { return Number(resolvePlayerRecord(playerId)?.mvpRounds || 0); }
export function getPlayerContributionPoints(playerId) { return Number(resolvePlayerRecord(playerId)?.contributionPoints || 0); }

export function resetMvpLeaderboard() {
  state = { sessionId: getSessionId(), players: {} };
  save();
}
