import { eventBus } from "./eventBus";
import { commandConfigManager } from "./commandConfigManager";
import { addPlayer, removePlayer } from "./playerManager";
import { isGenderTeamsMode } from "./genderTeamsMode";

const STORAGE_KEY_PLAYERS = "cocoloco_registered_players_v2";
const STORAGE_KEY_STATUS = "cocoloco_registration_status_v2";

class RegistrationManager {
  constructor() {
    this.status = localStorage.getItem(STORAGE_KEY_STATUS) || "CLOSED";
    this.registeredPlayers = new Map();
    this.loadFromStorage();
    this.initListener();
  }

  loadFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_PLAYERS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) parsed.forEach(p => { if (p?.playerId) this.registeredPlayers.set(p.playerId, p); });
      }
    } catch (e) { console.warn("[RegistrationManager] Failed to load from storage:", e); }
  }

  saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY_PLAYERS, JSON.stringify(Array.from(this.registeredPlayers.values())));
      localStorage.setItem(STORAGE_KEY_STATUS, this.status);
    } catch (e) { console.warn("[RegistrationManager] Failed to save to storage:", e); }
  }

  initListener() {
    eventBus.subscribe("registration:state_synced", ({ players, status }) => {
      if (status) this.status = status;
      if (Array.isArray(players)) {
        this.registeredPlayers.clear();
        players.forEach(p => { if (p?.playerId) this.registeredPlayers.set(p.playerId, p); });
        eventBus.publish("registration:updated", { players: Array.from(this.registeredPlayers.values()), status: this.status });
      }
    });
  }

  broadcastSync() {
    this.saveToStorage();
    const payload = { players: Array.from(this.registeredPlayers.values()), status: this.status };
    eventBus.emit("registration:state_synced", payload);
    eventBus.publish("registration:updated", payload);
  }

  getRegistrationState() {
    const config = commandConfigManager.getConfig();
    const players = Array.from(this.registeredPlayers.values());
    const teamGroups = {};
    if (config.gameRegistrationMode === "TEAMS" || config.gameRegistrationMode === "TEAM" || isGenderTeamsMode(config.gameRegistrationMode)) {
      (config.teams || []).forEach(t => {
        const members = players.filter(p => p.teamId === t.id);
        teamGroups[t.id] = { ...t, players: members, count: members.length };
      });
    }
    return { status: this.status, mode: config.gameRegistrationMode, players, teamGroups, count: players.length, readiness: this.checkRoundReadiness(), timestamp: Date.now() };
  }

  openRegistration() {
    if (this.status === "OPEN") return true;
    this.status = "OPEN";
    this.broadcastSync();
    eventBus.publish("registration:opened", { status: this.status, timestamp: Date.now() });
    return true;
  }
  closeRegistration() {
    if (this.status === "CLOSED") return true;
    this.status = "CLOSED";
    this.broadcastSync();
    eventBus.publish("registration:closed", { status: this.status, timestamp: Date.now() });
    return true;
  }
  lockRegistration() {
    if (this.status === "LOCKED") return true;
    this.status = "LOCKED";
    this.broadcastSync();
    eventBus.publish("registration:locked", { status: this.status, timestamp: Date.now() });
    return true;
  }

  registerPlayer(playerData) {
    const config = commandConfigManager.getConfig();
    const genderMode = isGenderTeamsMode(config.gameRegistrationMode);

    // Gender mode is session-persistent: a returning participant may be
    // recognized even while the round registration is locked.
    const playerId = playerData.playerId || playerData.id || playerData.username || playerData.uniqueId;
    const username = playerData.username || playerData.displayName || playerData.uniqueId || playerId;
    const existing = this.registeredPlayers.get(playerId);
    if (genderMode && existing) return { success: true, player: existing, alreadyRegistered: true };

    if (this.status !== "OPEN") {
      eventBus.publish("registration:rejected", { playerData, reason: "REGISTRATION_CLOSED", timestamp: Date.now() });
      return { success: false, reason: "REGISTRATION_CLOSED" };
    }
    if (!playerId) return { success: false, reason: "INVALID_PLAYER_ID" };
    if (this.registeredPlayers.has(playerId)) return { success: false, reason: "ALREADY_REGISTERED", player: this.registeredPlayers.get(playerId) };
    for (const p of this.registeredPlayers.values()) {
      if (p.username?.toLowerCase() === username.toLowerCase() || p.displayName?.toLowerCase() === username.toLowerCase()) {
        if (genderMode) return { success: true, player: p, alreadyRegistered: true };
        eventBus.publish("registration:duplicate_attempt", { playerId, player: p, timestamp: Date.now() });
        return { success: false, reason: "ALREADY_REGISTERED" };
      }
    }

    let assignedTeamId = playerData.teamId;
    if (config.gameRegistrationMode === "TEAMS" || config.gameRegistrationMode === "TEAM" || genderMode) {
      const team = (config.teams || []).find(t => t.id === assignedTeamId);
      if (!team) return { success: false, reason: "INVALID_TEAM" };
      const currentTeamCount = Array.from(this.registeredPlayers.values()).filter(p => p.teamId === assignedTeamId).length;
      if (currentTeamCount >= team.maxPlayers) return { success: false, reason: "TEAM_FULL" };
    } else if (this.registeredPlayers.size >= config.maxPlayers) return { success: false, reason: "MAX_PLAYERS_REACHED" };

    const avatar = playerData.avatar || playerData.profilePictureUrl || playerData.profilePicture || playerData.payload?.profilePictureUrl || playerData.payload?.data?.profilePictureUrl || playerData.payload?.avatar || "";
    const player = { playerId, displayName: playerData.displayName || playerData.name || username, username, avatar, teamId: assignedTeamId || null, teamName: assignedTeamId ? config.teams.find(t => t.id === assignedTeamId)?.name : null, joinedAt: playerData.joinedAt || Date.now(), source: playerData.source || "CHAT", status: playerData.status || "ACTIVE" };
    this.registeredPlayers.set(playerId, player);
    const gamePlayer = addPlayer({ name: player.displayName, displayName: player.displayName, username: player.username, tiktokId: player.playerId, avatar: player.avatar, teamId: player.teamId });
    if (gamePlayer && player.teamId && !gamePlayer.teamId) gamePlayer.teamId = player.teamId;
    this.broadcastSync();
    eventBus.publish("registration:player_registered", { player, count: this.registeredPlayers.size });
    return { success: true, player };
  }

  checkRoundReadiness() {
    const config = commandConfigManager.getConfig();
    const players = Array.from(this.registeredPlayers.values());
    if (config.gameRegistrationMode === "INDIVIDUAL") {
      if (players.length < config.minPlayers) return { ready: false, message: `Faltan ${config.minPlayers - players.length} jugadores (Mínimo requerido: ${config.minPlayers}).` };
      if (players.length > config.maxPlayers) return { ready: false, message: `Se supera el máximo de jugadores permitido (${config.maxPlayers}).` };
      return { ready: true, message: "Listo para iniciar ronda individual." };
    }
    for (const t of (config.teams || [])) {
      const count = players.filter(p => p.teamId === t.id).length;
      if (count < t.minPlayers) return { ready: false, message: `El equipo "${t.name}" necesita ${t.minPlayers - count} jugadores más (Mín: ${t.minPlayers}).` };
      if (count > t.maxPlayers) return { ready: false, message: `El equipo "${t.name}" supera el máximo de jugadores (${t.maxPlayers}).` };
    }
    return { ready: true, message: "Todos los equipos alcanzan sus mínimos. ¡Listo para iniciar ronda!" };
  }

  removePlayer(playerId) {
    if (this.status === "LOCKED") return { success: false, reason: "REGISTRATION_LOCKED" };
    if (!this.registeredPlayers.has(playerId)) return { success: false, reason: "PLAYER_NOT_FOUND" };
    const player = this.registeredPlayers.get(playerId);
    this.registeredPlayers.delete(playerId); removePlayer(playerId); this.broadcastSync();
    eventBus.publish("registration:player_removed", { playerId, player, count: this.registeredPlayers.size });
    return { success: true, player };
  }

  getRegisteredPlayers() { return Array.from(this.registeredPlayers.values()); }

  prepareNextRoundRegistration() {
    const config = commandConfigManager.getConfig();
    if (isGenderTeamsMode(config.gameRegistrationMode)) {
      // Preserve participant identity/team for the whole LIVE session.
      // Only reset round-scoped player state; do not clear registration.
      this.status = "OPEN";
      this.broadcastSync();
      eventBus.publish("registration:opened", { status: this.status, timestamp: Date.now(), reason: "ROUND_FINISHED_PERSISTENT_SESSION" });
      return { success: true, removedCount: 0, preservedCount: this.registeredPlayers.size };
    }
    const previousPlayers = Array.from(this.registeredPlayers.values());
    previousPlayers.forEach(player => removePlayer(player.playerId));
    this.registeredPlayers.clear(); this.status = "OPEN";
    eventBus.emit("players:reset", { removedCount: previousPlayers.length, reason: "ROUND_FINISHED", timestamp: Date.now() });
    this.broadcastSync();
    eventBus.publish("registration:cleared", { timestamp: Date.now(), removedCount: previousPlayers.length, reason: "ROUND_FINISHED" });
    eventBus.publish("registration:opened", { status: this.status, timestamp: Date.now(), reason: "ROUND_FINISHED" });
    return { success: true, removedCount: previousPlayers.length };
  }

  clearRegistration() {
    if (this.status === "LOCKED") return { success: false, reason: "REGISTRATION_LOCKED" };
    const previousPlayers = Array.from(this.registeredPlayers.values());
    previousPlayers.forEach(player => removePlayer(player.playerId));
    this.registeredPlayers.clear(); this.status = "OPEN";
    eventBus.emit("players:reset", { removedCount: previousPlayers.length, reason: "MANUAL_CLEAR", timestamp: Date.now() });
    this.broadcastSync(); eventBus.publish("registration:cleared", { timestamp: Date.now(), removedCount: previousPlayers.length });
    return { success: true, removedCount: previousPlayers.length };
  }
}

export const registrationManager = new RegistrationManager();
