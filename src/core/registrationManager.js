import { eventBus } from "./eventBus";
import { commandConfigManager } from "./commandConfigManager";
import { addPlayer, removePlayer } from "./playerManager";

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
      localStorage.setItem(
        STORAGE_KEY_PLAYERS,
        JSON.stringify(Array.from(this.registeredPlayers.values()))
      );
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
  }

  broadcastSync() {
    this.saveToStorage();
    const payload = {
      players: Array.from(this.registeredPlayers.values()),
      status: this.status
    };
    eventBus.emit("registration:state_synced", payload);
    eventBus.publish("registration:updated", payload);
  }

  getRegistrationState() {
    const config = commandConfigManager.getConfig();
    const players = Array.from(this.registeredPlayers.values());
    const readiness = this.checkRoundReadiness();
    const teamGroups = {};

    if (config.gameRegistrationMode === "TEAMS") {
      config.teams.forEach(t => {
        teamGroups[t.id] = {
          ...t,
          players: players.filter(p => p.teamId === t.id),
          count: players.filter(p => p.teamId === t.id).length
        };
      });
    }

    return {
      status: this.status,
      mode: config.gameRegistrationMode,
      players,
      teamGroups,
      count: players.length,
      readiness,
      timestamp: Date.now()
    };
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
    if (this.status !== "OPEN") {
      eventBus.publish("registration:rejected", {
        playerData,
        reason: "REGISTRATION_CLOSED",
        timestamp: Date.now()
      });
      return { success: false, reason: "REGISTRATION_CLOSED" };
    }

    const playerId = playerData.playerId || playerData.id || playerData.username || playerData.uniqueId;
    if (!playerId) {
      eventBus.publish("registration:rejected", { playerData, reason: "INVALID_PLAYER_ID", timestamp: Date.now() });
      return { success: false, reason: "INVALID_PLAYER_ID" };
    }

    const username = playerData.username || playerData.displayName || playerData.uniqueId || playerId;
    const avatar = playerData.avatar ||
      playerData.profilePictureUrl ||
      playerData.profilePicture ||
      playerData.payload?.profilePictureUrl ||
      playerData.payload?.data?.profilePictureUrl ||
      playerData.payload?.avatar ||
      "";

    if (this.registeredPlayers.has(playerId)) {
      const existingPlayer = this.registeredPlayers.get(playerId);
      eventBus.publish("registration:duplicate_attempt", { playerId, player: existingPlayer, timestamp: Date.now() });
      return { success: false, reason: "ALREADY_REGISTERED" };
    }

    for (const p of this.registeredPlayers.values()) {
      if (p.username?.toLowerCase() === username.toLowerCase() || p.displayName?.toLowerCase() === username.toLowerCase()) {
        eventBus.publish("registration:duplicate_attempt", { playerId, player: p, timestamp: Date.now() });
        return { success: false, reason: "ALREADY_REGISTERED" };
      }
    }

    const config = commandConfigManager.getConfig();
    let assignedTeamId = playerData.teamId;

    if (config.gameRegistrationMode === "TEAMS") {
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
      if (count < config.minPlayers) {
        return {
          ready: false,
          message: `Faltan ${config.minPlayers - count} jugadores (Mínimo requerido: ${config.minPlayers}).`
        };
      }
      if (count > config.maxPlayers) {
        return {
          ready: false,
          message: `Se supera el máximo de jugadores permitido (${config.maxPlayers}).`
        };
      }
      return { ready: true, message: "Listo para iniciar ronda individual." };
    }

    const teams = config.teams;
    for (const t of teams) {
      const teamPlayers = players.filter(p => p.teamId === t.id);
      const tCount = teamPlayers.length;
      if (tCount < t.minPlayers) {
        return {
          ready: false,
          message: `El equipo "${t.name}" necesita ${t.minPlayers - tCount} jugadores más (Mín: ${t.minPlayers}).`
        };
      }
      if (tCount > t.maxPlayers) {
        return {
          ready: false,
          message: `El equipo "${t.name}" supera el máximo de jugadores (${t.maxPlayers}).`
        };
      }
    }
    return { ready: true, message: "Todos los equipos alcanzan sus mínimos. ¡Listo para iniciar ronda!" };
  }

  removePlayer(playerId) {
    if (this.status === "LOCKED") {
      return { success: false, reason: "REGISTRATION_LOCKED" };
    }

    if (!this.registeredPlayers.has(playerId)) {
      return { success: false, reason: "PLAYER_NOT_FOUND" };
    }

    const player = this.registeredPlayers.get(playerId);
    this.registeredPlayers.delete(playerId);
    removePlayer(playerId);
    this.broadcastSync();
    eventBus.publish("registration:player_removed", {
      playerId,
      player,
      count: this.registeredPlayers.size
    });
    return { success: true, player };
  }

  getRegisteredPlayers() {
    return Array.from(this.registeredPlayers.values());
  }

  /**
   * Clears the current registration AND removes those identities from the
   * canonical playerManager. This is the clean-slate operation for a new round.
   * It is intentionally allowed when CLOSED (after a round has ended), but not
   * while LOCKED because LOCKED means the current round is still protected.
   */
  clearRegistration() {
    if (this.status === "LOCKED") {
      return { success: false, reason: "REGISTRATION_LOCKED" };
    }

    const previousPlayers = Array.from(this.registeredPlayers.values());

    previousPlayers.forEach(player => {
      removePlayer(player.playerId);
    });

    this.registeredPlayers.clear();
    this.status = "OPEN";
    this.broadcastSync();

    eventBus.publish("registration:cleared", {
      timestamp: Date.now(),
      removedCount: previousPlayers.length
    });

    return { success: true, removedCount: previousPlayers.length };
  }
}

export const registrationManager = new RegistrationManager();
