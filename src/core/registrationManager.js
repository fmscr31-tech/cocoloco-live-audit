import { eventBus } from "./eventBus";
import { commandConfigManager } from "./commandConfigManager";
import { addPlayer, removePlayer } from "./playerManager";

const STORAGE_KEY_PLAYERS = "cocoloco_registered_players_v2";
const STORAGE_KEY_STATUS = "cocoloco_registration_status_v2";

/**
 * Registration Manager v2 (Core with Cross-Window & Storage Synchronization)
 * Manages player signups, team assignments, competition registration lifecycle (OPEN, CLOSED, LOCKED),
 * max capacity checks, team limits, and round readiness validation.
 * 
 * INCIDENT 001 FIX: JOIN events are strictly informational and NEVER auto-register players.
 * INCIDENT 002 FIX: Robust avatar extraction and preservation.
 * INCIDENT 004 FIX: closeRegistration() closes registration without deleting participants.
 */
class RegistrationManager {
  constructor() {
    this.status = localStorage.getItem(STORAGE_KEY_STATUS) || "CLOSED"; // OPEN, CLOSED, LOCKED
    this.registeredPlayers = new Map(); // playerId -> player object
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
            if (p && p.playerId) {
              this.registeredPlayers.set(p.playerId, p);
            }
          });
        }
      }
    } catch (e) {
      console.warn("[RegistrationManager] Failed to load from storage:", e);
    }
  }

  saveToStorage() {
    try {
      const arr = Array.from(this.registeredPlayers.values());
      localStorage.setItem(STORAGE_KEY_PLAYERS, JSON.stringify(arr));
      localStorage.setItem(STORAGE_KEY_STATUS, this.status);
    } catch (e) {
      console.warn("[RegistrationManager] Failed to save to storage:", e);
    }
  }

  initListener() {
    // INCIDENT 001 FIX: Removed normalized:join auto-registration listener.
    // JOIN of the LIVE is strictly informational and never registers a player or creates a bubble.

    // Cross-window / cross-tab synchronization listeners
    eventBus.subscribe("registration:state_synced", ({ players, status }) => {
      console.log("[REGISTRATION SYNC RECEIVE]", { players, status });
      if (status) this.status = status;
      if (Array.isArray(players)) {
        this.registeredPlayers.clear();
        players.forEach(p => {
          if (p && p.playerId) {
            this.registeredPlayers.set(p.playerId, p);
          }
        });
        console.log("[REGISTRATION STATE UPDATED]", Array.from(this.registeredPlayers.values()));
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
    console.log("[REGISTRATION SYNC SEND]", payload);
    eventBus.emit("registration:state_synced", payload);
    eventBus.publish("registration:updated", payload);
  }

  /**
   * Returns current registration status, player list, team groupings, and readiness.
   */
  getRegistrationState() {
    const config = commandConfigManager.getConfig();
    const players = Array.from(this.registeredPlayers.values());
    const readiness = this.checkRoundReadiness();

    // Group players by team if TEAMS mode
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
      count: players.size || players.length,
      readiness,
      timestamp: Date.now()
    };
  }

  /**
   * Opens registration for new players.
   */
  openRegistration() {
    if (this.status === "OPEN") return true;
    this.status = "OPEN";
    console.log("[REGISTRATION ADMIN] Registration opened.");
    this.broadcastSync();
    eventBus.publish("registration:opened", { status: this.status, timestamp: Date.now() });
    return true;
  }

  /**
   * Closes registration. INCIDENT 004: Closes inscripción without deleting participants.
   */
  closeRegistration() {
    if (this.status === "CLOSED") return true;
    this.status = "CLOSED";
    console.log("[REGISTRATION ADMIN] Registration closed. Participants preserved.");
    this.broadcastSync();
    eventBus.publish("registration:closed", { status: this.status, timestamp: Date.now() });
    return true;
  }

  /**
   * Locks registration (no further adds or removes permitted).
   */
  lockRegistration() {
    if (this.status === "LOCKED") return true;
    this.status = "LOCKED";
    console.log("[REGISTRATION ADMIN] Registration locked.");
    this.broadcastSync();
    eventBus.publish("registration:locked", { status: this.status, timestamp: Date.now() });
    return true;
  }

  /**
   * Registers a player if status is OPEN and player is not already registered.
   */
  registerPlayer(playerData) {
    console.log("[REGISTRATION ADMIN] registerPlayer called:", playerData);
    if (this.status !== "OPEN") {
      console.warn("[RegistrationManager] Cannot register player: registration is not OPEN.");
      eventBus.publish("registration:rejected", { playerData, reason: "REGISTRATION_CLOSED", timestamp: Date.now() });
      return { success: false, reason: "REGISTRATION_CLOSED" };
    }

    const playerId = playerData.playerId || playerData.id || playerData.username || playerData.uniqueId;
    if (!playerId) {
      eventBus.publish("registration:rejected", { playerData, reason: "INVALID_PLAYER_ID", timestamp: Date.now() });
      return { success: false, reason: "INVALID_PLAYER_ID" };
    }

    const username = playerData.username || playerData.displayName || playerData.uniqueId || playerId;
    
    // INCIDENT 002 FIX: Robust avatar extraction
    const avatar = playerData.avatar || 
                   playerData.profilePictureUrl || 
                   playerData.profilePicture || 
                   playerData.payload?.profilePictureUrl || 
                   playerData.payload?.data?.profilePictureUrl || 
                   playerData.payload?.avatar || 
                   "";

    // Check duplicate
    if (this.registeredPlayers.has(playerId)) {
      const existingPlayer = this.registeredPlayers.get(playerId);
      eventBus.publish("registration:duplicate_attempt", { playerId, player: existingPlayer, timestamp: Date.now() });
      return { success: false, reason: "ALREADY_REGISTERED" };
    }

    for (const [key, p] of this.registeredPlayers.entries()) {
      if (p.username?.toLowerCase() === username.toLowerCase() || p.displayName?.toLowerCase() === username.toLowerCase()) {
        eventBus.publish("registration:duplicate_attempt", { playerId, player: p, timestamp: Date.now() });
        return { success: false, reason: "ALREADY_REGISTERED" };
      }
    }

    const config = commandConfigManager.getConfig();

    // Check team capacity if TEAMS mode
    let assignedTeamId = playerData.teamId;
    if (config.gameRegistrationMode === "TEAMS") {
      const team = config.teams.find(t => t.id === assignedTeamId);
      if (!team) {
        return { success: false, reason: "INVALID_TEAM" };
      }
      const currentTeamCount = Array.from(this.registeredPlayers.values()).filter(p => p.teamId === assignedTeamId).length;
      if (currentTeamCount >= team.maxPlayers) {
        eventBus.publish("registration:rejected", { playerData, reason: "TEAM_FULL", timestamp: Date.now() });
        return { success: false, reason: "TEAM_FULL" };
      }
    } else {
      if (this.registeredPlayers.size >= config.maxPlayers) {
        eventBus.publish("registration:rejected", { playerData, reason: "MAX_PLAYERS_REACHED", timestamp: Date.now() });
        return { success: false, reason: "MAX_PLAYERS_REACHED" };
      }
    }

    const player = {
      playerId,
      displayName: playerData.displayName || playerData.name || username,
      username: username,
      avatar: avatar,
      teamId: assignedTeamId || null,
      teamName: assignedTeamId ? config.teams.find(t => t.id === assignedTeamId)?.name : null,
      joinedAt: playerData.joinedAt || Date.now(),
      source: playerData.source || "CHAT",
      status: playerData.status || "ACTIVE"
    };

    this.registeredPlayers.set(playerId, player);

    // Synchronize into playerManager
    const gamePlayer = addPlayer({
      name: player.displayName,
      displayName: player.displayName,
      username: player.username,
      tiktokId: player.playerId,
      avatar: player.avatar,
      teamId: player.teamId
    });
    if (gamePlayer && player.teamId && !gamePlayer.teamId) {
      gamePlayer.teamId = player.teamId;
    }

    this.broadcastSync();
    console.log(`[REGISTRATION ADMIN] Player registered successfully: ${player.displayName} (${playerId})`, player);

    eventBus.publish("registration:player_registered", { player, count: this.registeredPlayers.size });
    return { success: true, player };
  }

  /**
   * Validates if the tournament / round is ready to start based on configuration and registered players.
   */
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
    } else {
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
  }

  /**
   * Removes a player from registration (if not LOCKED).
   */
  removePlayer(playerId) {
    console.log("[REGISTRATION ADMIN] removePlayer called:", playerId);
    if (this.status === "LOCKED") {
      console.warn("[RegistrationManager] Cannot remove player: registration is LOCKED.");
      return { success: false, reason: "REGISTRATION_LOCKED" };
    }

    if (!this.registeredPlayers.has(playerId)) {
      return { success: false, reason: "PLAYER_NOT_FOUND" };
    }

    const player = this.registeredPlayers.get(playerId);
    this.registeredPlayers.delete(playerId);
    
    removePlayer(playerId);

    this.broadcastSync();
    console.log(`[REGISTRATION ADMIN] Player removed successfully: ${playerId}`);

    eventBus.publish("registration:player_removed", { playerId, player, count: this.registeredPlayers.size });
    return { success: true, player };
  }

  /**
   * Returns list of registered players.
   */
  getRegisteredPlayers() {
    return Array.from(this.registeredPlayers.values());
  }

  /**
   * Clears all registered players (if not LOCKED), keeping configuration intact.
   */
  clearRegistration() {
    console.log("[REGISTRATION ADMIN] clearRegistration called");
    if (this.status === "LOCKED") {
      console.warn("[RegistrationManager] Cannot clear registration: registration is LOCKED.");
      return { success: false, reason: "REGISTRATION_LOCKED" };
    }

    this.registeredPlayers.clear();
    this.broadcastSync();
    console.log("[REGISTRATION ADMIN] Registration cleared.");
    eventBus.publish("registration:cleared", { timestamp: Date.now() });
    return { success: true };
  }
}

export const registrationManager = new RegistrationManager();
