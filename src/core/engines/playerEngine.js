import { eventBus } from "../eventBus";
import { addPlayer, players } from "../playerManager";
import { createPlayer } from "../gameEngine";

/**
 * Player Engine v2: Sole responsible for administering player lifecycles from stream events.
 * 
 * P0 FIX (Incident 028): Removed point mutation under case "GIFT" in handleEvent()
 * to prevent duplicate scoring (since scoring is exclusively managed by giftActionDispatcher).
 * Also respects Incident 001 (JOIN events never auto-register players).
 */
class PlayerEngine {
  constructor() {
    this.activePlayers = new Map();
    if (Array.isArray(players)) {
      players.forEach(p => {
        this.activePlayers.set(p.userId || p.id, {
          id: p.id,
          userId: p.userId || p.id,
          username: p.name,
          firstInteraction: p.createdAt || Date.now(),
          lastInteraction: Date.now(),
          messages: 0,
          gifts: 0,
          likes: 0,
          follows: 0,
          shares: 0,
          points: p.points || 0,
          wins: p.wins || 0,
          teamId: p.teamId || null
        });
      });
    }
    this.initRegistrationListener();
  }

  initRegistrationListener() {
    eventBus.subscribe("registration:player_registered", ({ player }) => {
      if (!player) return;
      console.log("[Registration → GamePlayer] TikTok identity received:", player);
      const created = createPlayer({
        name: player.displayName || player.playerId,
        displayName: player.displayName || player.username || player.playerId,
        tiktokId: player.playerId || "",
        username: player.username || player.displayName || "",
        avatar: player.avatar || player.profilePictureUrl || ""
      });
      console.log("[Registration → GamePlayer] createPlayer executed, result:", created);
      
      const identifier = player.playerId || player.displayName;
      let active = this.activePlayers.get(identifier) || Array.from(this.activePlayers.values()).find(p => p.username.toLowerCase() === (player.displayName || "").toLowerCase());
      if (!active && created) {
        active = {
          id: created.id,
          userId: identifier,
          username: player.displayName || player.playerId,
          firstInteraction: Date.now(),
          lastInteraction: Date.now(),
          messages: 0,
          gifts: 0,
          likes: 0,
          follows: 0,
          shares: 0,
          points: created.points || 0,
          wins: created.wins || 0,
          teamId: created.teamId || null
        };
        this.activePlayers.set(identifier, active);
      }
    });
  }

  /**
   * Processes any incoming stream event and tracks player activity metrics.
   * INCIDENT 001 FIX: JOIN events never auto-register.
   * INCIDENT 028 FIX: GIFT events track gift count but do not mutate points directly (exclusive to giftActionDispatcher).
   */
  handleEvent(event) {
    if (!event || !event.username) return;

    const type = event.type?.toUpperCase();

    // INCIDENT 001 FIX: JOIN events are strictly informational and never auto-register players
    if (type === "JOIN") {
      return null;
    }

    const identifier = event.userId || event.username;
    let player = this.activePlayers.get(identifier);

    const now = Date.now();

    if (!player) {
      // Automatically register new player via gameEngine / playerManager workflow for chat/gifts/etc.
      const newPlayerRecord = createPlayer({
        name: event.username,
        displayName: event.displayName || event.username,
        tiktokId: event.userId || "",
        username: event.username || "",
        avatar: event.profilePictureUrl || event.avatar || event.profilePicture || ""
      });
      player = {
        id: newPlayerRecord.id,
        userId: identifier,
        username: event.username,
        firstInteraction: now,
        lastInteraction: now,
        messages: 0,
        gifts: 0,
        likes: 0,
        follows: 0,
        shares: 0,
        points: newPlayerRecord.points || 0,
        wins: newPlayerRecord.wins || 0,
        teamId: newPlayerRecord.teamId || null
      };
      this.activePlayers.set(identifier, player);

      eventBus.emit("player:created", player);
    } else {
      player.lastInteraction = now;
      player.username = event.username;
      if (!player.avatar && (event.profilePictureUrl || event.avatar || event.profilePicture)) {
        player.avatar = event.profilePictureUrl || event.avatar || event.profilePicture;
      }
    }

    // Update specific metrics based on event type
    switch (type) {
      case "CHAT":
        player.messages += 1;
        break;
      case "GIFT":
        player.gifts += 1;
        // P0 FIX (Incident 028): DO NOT add points here. Scoring is handled exclusively by giftActionDispatcher
        break;
      case "LIKE":
        player.likes += Number(event.value || 1);
        break;
      case "FOLLOW":
        player.follows += 1;
        break;
      case "SHARE":
        player.shares += 1;
        break;
      default:
        break;
    }

    eventBus.emit("player:updated", player);
    return player;
  }

  getPlayer(identifier) {
    return this.activePlayers.get(identifier) || null;
  }

  getAllPlayers() {
    return Array.from(this.activePlayers.values());
  }
}

export const playerEngine = new PlayerEngine();
