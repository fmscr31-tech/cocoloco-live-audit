import { statisticsEngine } from "./statisticsEngine";

/**
 * Ranking Engine: Generates dynamic rankings and leaderboards based on statistics 
 * (Top supporters, Top players by points, Top participants, Most active user).
 */
class RankingEngine {
  constructor() {}

  /**
   * Returns top players sorted by accumulated points.
   */
  getTopPlayers(limit = 10) {
    const stats = statisticsEngine.getStatistics();
    const sorted = [...stats.players].sort((a, b) => (b.points || 0) - (a.points || 0));
    return sorted.slice(0, limit);
  }

  /**
   * Returns top supporters sorted by gifts sent or points generated from gifts.
   */
  getTopSupporters(limit = 10) {
    const stats = statisticsEngine.getStatistics();
    const sorted = [...stats.players].sort((a, b) => (b.gifts || 0) - (a.gifts || 0));
    return sorted.slice(0, limit);
  }

  /**
   * Returns top participants sorted by overall activity (messages + gifts + likes).
   */
  getTopParticipants(limit = 10) {
    const stats = statisticsEngine.getStatistics();
    const sorted = [...stats.players].sort((a, b) => {
      const scoreA = (a.messages || 0) + (a.gifts || 0) * 3 + (a.likes || 0);
      const scoreB = (b.messages || 0) + (b.gifts || 0) * 3 + (b.likes || 0);
      return scoreB - scoreA;
    });
    return sorted.slice(0, limit);
  }

  /**
   * Returns session summary rankings including most active user.
   */
  getPlayerRanking() {
    const stats = statisticsEngine.getStatistics();
    return {
      topPoints: this.getTopPlayers(5),
      topSupporters: this.getTopSupporters(5),
      topParticipants: this.getTopParticipants(5),
      sessionSummary: stats.session
    };
  }
}

export const rankingEngine = new RankingEngine();
