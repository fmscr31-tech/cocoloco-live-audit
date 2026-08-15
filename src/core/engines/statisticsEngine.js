import { eventBus } from "../eventBus";
import { playerEngine } from "./playerEngine";
import { sessionManager } from "../sessionManager";

/**
 * Statistics Engine: Centralized module responsible for gathering, aggregating, 
 * and maintaining real-time metrics for players and the active stream session.
 */
class StatisticsEngine {
  constructor() {
    this.stats = {
      session: {
        totalParticipants: 0,
        eventsProcessed: 0,
        totalGifts: 0,
        generatedPoints: 0,
        totalMessages: 0,
        totalLikes: 0,
        mostActiveUser: null
      },
      players: new Map()
    };
    this.initListeners();
  }

  initListeners() {
    eventBus.subscribe("player:created", (player) => {
      this.stats.players.set(player.userId || player.id, player);
      this.recalculateSessionStats();
    });

    eventBus.subscribe("player:updated", (player) => {
      this.stats.players.set(player.userId || player.id, player);
      this.recalculateSessionStats();
    });

    eventBus.subscribe("reward:processed", (reward) => {
      this.stats.session.totalGifts += 1;
      this.recalculateSessionStats();
    });

    eventBus.subscribe("session:updated", (session) => {
      this.stats.session.eventsProcessed = session.eventsProcessed || 0;
      this.stats.session.totalMessages = session.totalMessages || 0;
      this.stats.session.totalLikes = session.totalLikes || 0;
      this.stats.session.generatedPoints = session.accumulatedPoints || 0;
      this.recalculateSessionStats();
    });
  }

  recalculateSessionStats() {
    const playersArr = Array.from(this.stats.players.values());
    this.stats.session.totalParticipants = playersArr.length;

    let mostActive = null;
    let maxActivity = -1;

    playersArr.forEach(p => {
      const activity = (p.messages || 0) + (p.gifts || 0) * 5 + (p.likes || 0) * 0.1;
      if (activity > maxActivity) {
        maxActivity = activity;
        mostActive = p;
      }
    });

    this.stats.session.mostActiveUser = mostActive ? mostActive.username : null;
  }

  /**
   * Returns aggregated statistics for the session and players.
   */
  getStatistics() {
    return {
      session: { ...this.stats.session },
      players: Array.from(this.stats.players.values())
    };
  }
}

export const statisticsEngine = new StatisticsEngine();
