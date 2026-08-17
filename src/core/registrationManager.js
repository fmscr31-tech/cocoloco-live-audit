import { eventBus } from "./eventBus";
import { commandConfigManager } from "./commandConfigManager";
import { addPlayer, removePlayer } from "./playerManager";
import { isGenderTeamsMode } from "./genderTeamsMode";

const STORAGE_KEY_PLAYERS = "cocoloco_registered_players_v2";
const STORAGE_KEY_STATUS = "cocoloco_registration_status_v2";

/**
 * Registration Manager v2
 *
 * Owns the registration lifecycle and keeps registration/playerManager in sync.
 * A completed round must be able to start a fresh registration cycle without
 * leaving the previous round's manual players in the overlay.
 */
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
        if (Array.isArray(parsed)) {
          this.registeredPlayers.clear();
          parsed.forEach(p => {
            if (p && p.playerId) this.registeredPlayers.set(p.playerId, p);
          });
        }
      }
    } catch (e) {
      console.warn("[RegistrationManager] Failed to load from storage:", e);
    }
  }

  saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY_PLAYERS, JSON.stringify(Array.from(this.registeredPlayers.values())));
      localStorage.setItem(STORAGE_KEY_STATUS, this.status);
    } catch (e) {
      console.warn("[RegistrationManager] Failed to save to storage:", e);
    }
  }

  initListener() {
    eventBus.subscribe("registration:state_synced", ({ players, status }) => {
      console.log("[REGISTRATION SYNC RECEIVE]", { players, status });
      if (status) this.status = status;
      if (Array.isArray(players)) {
        this.registeredPlayers.clear();
        players.forEach(p => {
          if (p && p.playerId) this.registeredPlayers.set(p.playerId, p);
        });
        eventBus.publish("registration:updated", {
          players: Array.from(this.registeredPlayers.values()),
          status: this.status
        });
      }
    });

    // Chicos vs Chicas owns the initial team assignment. Existing participants
    // remain registered for the whole LIVE session and are never re-added at
    // the beginning of another round.
    eventBus.subscribe("normalized:chat", (event) => {
      const config = commandConfigManager.getConfig();
      if (!isGenderTeamsMode(config.gameRegistrationMode) || this.status !== "OPEN") return;

      const message = String(event?.message || event?.comment || event?.text || "").trim().toLowerCase();
      const team = (config.teams || []).find(t =>
        Array.isArray(t.commands) && t.commands.some(command => String(command).trim().toLowerCase() === message)
      );
      if (!team) return;

      const result = this.registerPlayer({
        playerId: event.playerId || event.userId || event.uniqueId || event.username,
        displayName: event.displayName || event.username || event.nickname || "Viewer",
        username: event.username || event.uniqueId || event.displayName || "Viewer",
        avatar: event.profilePictureUrl || event.avatar || event.profilePicture || "",
        teamId: team.id,
        source: "CHAT"
      });

      eventBus.publish(result.success ? "gender:registration_accepted" : "gender:registration_rejected", {
        event,
        player: result.player,
        teamId: team.id,
        alreadyRegistered: result.alreadyRegistered === true,
        reason: result.reason
      });
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
    const readiness = this.checkRoundReadiness();
    const teamGroups = {};

    if (config.gameRegistrationMode === "TEAMS" || config.gameRegistrationMode === "TEAM" || isGenderTeamsMode(config.gameRegistrationMode)) {
      config.teams.forEach(t => {
        teamGroups[t.id] = {
          ...t,
          players: players.filter(p => p.teamId === t.id),
          count: players.filter(p => p.teamId === t.id).length
        };
      });
    }

    return { status: this.status, mode: config.gameRegistrationMode, players, teamGroups, count: players.length, readiness, timestamp: Date.now() };
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

    // In gender mode a returning viewer is already a member of their team for
    // the whole session. This is intentionally allowed even after round lock.
    const playerId = playerData.playerId || playerData.id || playerData.username || playerData.uniqueId;
    if (genderMode && playerId && this.registeredPlayers.has(playerId)) {
      return { success: true, player: this.registeredPlayers.get(playerId), alreadyRegistered: true };
    }

    if (this.status !== "OPEN") {
      eventBus.publish("registration:rejected", { playerData, reason: "REGISTRATION_CLOSED", timestamp: Date.now() });
      return { success: false, reason: "REGISTRATION_CLOSED" };
    }

    if (!playerId) {
      eventBus.publish("registration:rejected", { playerData, reason: "INVALID_PLAYER_ID", timestamp: Date.now() });
      return { success: false, reason: "INVALID_PLAYER_ID" };
    }

    const username = playerData.username || playerData.displayName || playerData.uniqueId || playerId;

    if (this.registeredPlayers.has(playerId)) {
      const existingPlayer = this.registeredPlayers.get(playerId);
      eventBus.publish("registration:duplicate_attempt", { playerId, player: existingPlayer, timestamp: Date.now() });
      return { success: false, reason: "ALREADY_REGISTERED" };
    }

    for (const p of this.registeredPlayers.values()) {
      if (p.username?.toLowerCase() === username.toLowerCase() || p.displayName?.toLowerCase() === username.toLowerCase()) {
        eventBus.publish("registration:duplicate_attempt", { playerId, player: p, timestamp: Date.now() });
        return genderMode
          ? { success: true, player: p, alreadyRegistered: true }
          : { success: false, reason: "ALREADY_REGISTERED" };
      }
    }

    let assignedTeamId = playerData.teamId;

    if (config.gameRegistrationMode === "TEAMS" || config.gameRegistrationMode === "TEAM" || genderMode) {
      const team = config.teams.find(t => t.id === assignedTeamId);
      if (!team) return { success: false, reason: "INVALID_TEAM" };
      const currentTeamCount = Array.from(this.registeredPlayers.values()).filter(p => p.teamId === assignedTeamId).length;
      if (currentTeamCount >= team.maxPlayers) {
        eventBus.publish("registration:rejected", { playerData, reason: "TEAM_FULL", timestamp: Date.now() });
        return { success: false, reason: "TEAM_FULL" };
      }
    } else if (this.registeredPlayers.size >= config.maxPlayers) {
      eventBus.publish("registration:rejected", { playerData, reason: "MAX_PLAYERS_REACHED", timestamp: Date.now() });
      return { success: false, reason: "MAX_PLAYERS_REACHED" };
    }

    const avatar = playerData.avatar || playerData.profilePictureUrl || playerData.profilePicture || playerData.payload?.profilePictureUrl || playerData.payload?.data?.profilePictureUrl || playerData.payload?.avatar || "";

    const player = {
      playerId,
      displayName: playerData.displayName || playerData.name || username,
      username,
      avatar,
      teamId: assignedTeamId || null,
      teamName: assignedTeamId ? config.teams.find(t => t.id === assignedTeamId)?.name : null,
      joinedAt: playerData.joinedAt || Date.now(),
      source: playerData.source || "CHAT",
      status: playerData.status || "ACTIVE"
    };

    this.registeredPlayers.set(playerId, player);

    const gamePlayer = addPlayer({
      name: player.displayName,
      displayName: player.displayName,
      username: player.username,
      tiktokId: player.playerId,
      avatar: player.avatar,
      teamId: player.teamId
    });

    if (gamePlayer && player.teamId && !gamePlayer.teamId) gamePlayer.teamId = player.teamId;

    this.broadcastSync();
    eventBus.publish("registration:player_registered", { player, count: this.registeredPlayers.size });
    return { success: true, player };
  }

  checkRoundReadiness() {
    const config = commandConfigManager.getConfig();
    const players = Array.from(this.registeredPlayers.values());

    if (config.gameRegistrationMode === "INDIVIDUAL") {
      const count = players.length;
      if (count < config.minPlayers) return { ready: false, message: `Faltan ${config.minPlayers - count} jugadores (Mínimo requerido: ${config.minPlayers}).` };
      if (count > config.maxPlayers) return { ready: false, message: `Se supera el máximo de jugadores permitido (${config.maxPlayers}).` };
      return { ready: true, message: "Listo para iniciar ronda individual." };
    }

    const teams = config.teams;
    for (const t of teams) {
      const teamPlayers = players.filter(p => p.teamId === t.id);
      const tCount = teamPlayers.length;
      if (tCount < t.minPlayers) return { ready: false, message: `El equipo "${t.name}" necesita ${t.minPlayers - tCount} jugadores más (Mín: ${t.minPlayers}).` };
      if (tCount > t.maxPlayers) return { ready: false, message: `El equipo "${t.name}" supera el máximo de jugadores (${t.maxPlayers}).` };
    }
    return { ready: true, message: "Todos los equipos alcanzan sus mínimos. ¡Listo para iniciar ronda!" };
  }

  removePlayer(playerId) {
    if (this.status === "LOCKED") return { success: false, reason: "REGISTRATION_LOCKED" };
    if (!this.registeredPlayers.has(playerId)) return { success: false, reason: "PLAYER_NOT_FOUND" };

    const player = this.registeredPlayers.get(playerId);
    this.registeredPlayers.delete(playerId);
    removePlayer(playerId);
    this.broadcastSync();
    eventBus.publish("registration:player_removed", { playerId, player, count: this.registeredPlayers.size });
    return { success: true, player };
  }

  getRegisteredPlayers() { return Array.from(this.registeredPlayers.values()); }

  prepareNextRoundRegistration() {
    const config = commandConfigManager.getConfig();

    if (isGenderTeamsMode(config.gameRegistrationMode)) {
      this.status = "OPEN";
      this.broadcastSync();
      eventBus.publish("registration:opened", { status: this.status, timestamp: Date.now(), reason: "ROUND_FINISHED_PERSISTENT_SESSION" });
      return { success: true, removedCount: 0, preservedCount: this.registeredPlayers.size };
    }

    const previousPlayers = Array.from(this.registeredPlayers.values());
    previousPlayers.forEach(player => removePlayer(player.playerId));
    this.registeredPlayers.clear();
    this.status = "OPEN";

    eventBus.emit("players:reset", { removedCount: previousPlayers.length, reason: "ROUND_FINISHED", timestamp: Date.now() });
    this.broadcastSync();
    eventBus.publish("registration:cleared", { timestamp: Date.now(), removedCount: previousPlayers.length, reason: "ROUND_FINISHED" });
    eventBus.publish("registration:opened", { status: this.status, timestamp: Date.now(), reason: "ROUND_FINISHED" });
    return { success: true, removedCount: previousPlayers.length };
  }

  clearRegistration(options = {}) {
    if (this.status === "LOCKED" && options.force !== true) return { success: false, reason: "REGISTRATION_LOCKED" };

    const previousPlayers = Array.from(this.registeredPlayers.values());
    previousPlayers.forEach(player => removePlayer(player.playerId));
    this.registeredPlayers.clear();
    this.status = "OPEN";

    eventBus.emit("players:reset", {
      removedCount: previousPlayers.length,
      reason: options.reason || "MANUAL_CLEAR",
      timestamp: Date.now()
    });

    this.broadcastSync();
    eventBus.publish("registration:cleared", {
      timestamp: Date.now(),
      removedCount: previousPlayers.length,
      reason: options.reason || "MANUAL_CLEAR"
    });
    return { success: true, removedCount: previousPlayers.length };
  }
}

export const registrationManager = new RegistrationManager();
