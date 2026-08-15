import { eventBus } from "../eventBus";

const STORAGE_KEY_MVPS = "cocoloco_history_mvps";
const STORAGE_KEY_WINNERS = "cocoloco_history_individual_winners";
const STORAGE_KEY_ROUNDS = "cocoloco_history_team_rounds";

class HistoryEngine {
  constructor() {
    this.mvps = this.loadStorage(STORAGE_KEY_MVPS);
    this.individualWinners = this.loadStorage(STORAGE_KEY_WINNERS);
    this.teamRounds = this.loadStorage(STORAGE_KEY_ROUNDS);
    this.recordedEvents = new Set(); // Idempotency memory cache
    this.initListeners();
  }

  loadStorage(key) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  saveStorage(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error(`Error saving ${key} to localStorage:`, e);
    }
  }

  getPeriod(timestamp = Date.now()) {
    const d = new Date(timestamp);
    const dateStr = d.toISOString().split("T")[0]; // YYYY-MM-DD
    const year = d.getFullYear();
    const month = d.getMonth();
    
    // Week calculation
    const firstJan = new Date(year, 0, 1);
    const days = Math.floor((d - firstJan) / (24 * 60 * 60 * 1000));
    const weekNum = Math.ceil((days + firstJan.getDay() + 1) / 7);
    const weekStr = `${year}-W${String(weekNum).padStart(2, '0')}`;
    const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;

    return {
      daily: dateStr,
      weekly: weekStr,
      monthly: monthStr
    };
  }

  initListeners() {
    // Listen for round finish or team win events to record history idempotently
    eventBus.subscribe("round:finished", (data) => {
      this.recordRoundHistory(data);
    });

    eventBus.subscribe("PLAYER_WIN", (data) => {
      this.recordIndividualWin(data.data || data);
    });

    eventBus.subscribe("win:correct", (data) => {
      this.recordIndividualWin(data);
    });
  }

  recordRoundHistory(data = {}) {
    const roundId = data.roundId || data.id || `round_${Date.now()}`;
    const eventKey = `round_${roundId}`;
    if (this.recordedEvents.has(eventKey)) return;
    this.recordedEvents.add(eventKey);

    const timestamp = data.timestamp || Date.now();
    const periods = this.getPeriod(timestamp);

    // 1. Record Team Round Winner if applicable
    if (data.winningTeamId || data.teamId) {
      const teamId = data.winningTeamId || data.teamId;
      const teamName = data.winningTeamName || data.teamName || "EQUIPO";
      this.teamRounds.push({
        id: `${roundId}_${teamId}`,
        teamId,
        teamName,
        roundId,
        timestamp,
        periods
      });
      this.saveStorage(STORAGE_KEY_ROUNDS, this.teamRounds);
      eventBus.emit("history:team_round_recorded", { teamId, roundId });
    }

    // 2. Record Team MVPs if applicable
    if (data.mvps && Array.isArray(data.mvps)) {
      data.mvps.forEach(mvp => {
        const playerId = mvp.id || mvp.playerId;
        const playerName = mvp.name || mvp.username || "JUGADOR";
        const teamId = mvp.teamId || data.teamId || "team1";
        const teamName = mvp.teamName || data.teamName || "EQUIPO";

        this.mvps.push({
          id: `${roundId}_${playerId}`,
          playerId,
          playerName,
          teamId,
          teamName,
          roundId,
          timestamp,
          periods
        });
      });
      this.saveStorage(STORAGE_KEY_MVPS, this.mvps);
      eventBus.emit("history:mvp_recorded", { count: data.mvps.length, roundId });
    }
  }

  recordIndividualWin(data = {}) {
    const winId = data.winId || data.playerId || data.id || `win_${Date.now()}_${Math.random()}`;
    const eventKey = `win_${winId}_${data.name || data.username || ""}`;
    if (this.recordedEvents.has(eventKey)) return;
    this.recordedEvents.add(eventKey);

    const timestamp = data.timestamp || Date.now();
    const periods = this.getPeriod(timestamp);
    const playerId = data.playerId || data.id || winId;
    const playerName = data.name || data.username || "JUGADOR";

    this.individualWinners.push({
      id: `${winId}_${timestamp}`,
      playerId,
      playerName,
      timestamp,
      periods
    });
    this.saveStorage(STORAGE_KEY_WINNERS, this.individualWinners);
    eventBus.emit("history:individual_win_recorded", { playerId, playerName });
  }

  // Manual recording helpers for admin controls
  manualRecordMVP(player, team, roundId = `manual_${Date.now()}`) {
    const timestamp = Date.now();
    const periods = this.getPeriod(timestamp);
    const record = {
      id: `${roundId}_${player.id || player.name}`,
      playerId: player.id || player.name,
      playerName: player.name || player.username || "JUGADOR",
      teamId: team?.id || player.teamId || "team1",
      teamName: team?.name || player.teamName || "EQUIPO",
      roundId,
      timestamp,
      periods
    };
    this.mvps.push(record);
    this.saveStorage(STORAGE_KEY_MVPS, this.mvps);
    eventBus.emit("history:mvp_recorded", record);
    return record;
  }

  manualRecordIndividualWin(player, matchId = `manual_${Date.now()}`) {
    const timestamp = Date.now();
    const periods = this.getPeriod(timestamp);
    const record = {
      id: `${matchId}_${player.id || player.name}`,
      playerId: player.id || player.name,
      playerName: player.name || player.username || "JUGADOR",
      timestamp,
      periods
    };
    this.individualWinners.push(record);
    this.saveStorage(STORAGE_KEY_WINNERS, this.individualWinners);
    eventBus.emit("history:individual_win_recorded", record);
    return record;
  }

  manualRecordTeamRound(team, roundId = `manual_${Date.now()}`) {
    const timestamp = Date.now();
    const periods = this.getPeriod(timestamp);
    const record = {
      id: `${roundId}_${team.id}`,
      teamId: team.id,
      teamName: team.name,
      roundId,
      timestamp,
      periods
    };
    this.teamRounds.push(record);
    this.saveStorage(STORAGE_KEY_ROUNDS, this.teamRounds);
    eventBus.emit("history:team_round_recorded", record);
    return record;
  }

  // Query getters with period filter ("DIARIO" | "SEMANAL" | "MENSUAL" | "ALL")
  getMvps(filter = "ALL") {
    if (filter === "ALL") return [...this.mvps];
    const currentPeriod = this.getPeriod(Date.now());
    const filterKey = filter === "DIARIO" ? "daily" : filter === "SEMANAL" ? "weekly" : "monthly";
    const targetVal = currentPeriod[filterKey];

    return this.mvps.filter(item => item.periods && item.periods[filterKey] === targetVal);
  }

  getIndividualWinners(filter = "ALL") {
    if (filter === "ALL") return [...this.individualWinners];
    const currentPeriod = this.getPeriod(Date.now());
    const filterKey = filter === "DIARIO" ? "daily" : filter === "SEMANAL" ? "weekly" : "monthly";
    const targetVal = currentPeriod[filterKey];

    return this.individualWinners.filter(item => item.periods && item.periods[filterKey] === targetVal);
  }

  getTeamRounds(filter = "ALL") {
    if (filter === "ALL") return [...this.teamRounds];
    const currentPeriod = this.getPeriod(Date.now());
    const filterKey = filter === "DIARIO" ? "daily" : filter === "SEMANAL" ? "weekly" : "monthly";
    const targetVal = currentPeriod[filterKey];

    return this.teamRounds.filter(item => item.periods && item.periods[filterKey] === targetVal);
  }

  // Aggregated Leaderboards
  getAggregatedMvps(filter = "ALL") {
    const items = this.getMvps(filter);
    const map = new Map();
    items.forEach(item => {
      const key = item.playerId || item.playerName;
      if (!map.has(key)) {
        map.set(key, {
          playerId: item.playerId,
          playerName: item.playerName,
          teamName: item.teamName,
          count: 0
        });
      }
      map.get(key).count += 1;
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }

  getAggregatedIndividualWinners(filter = "ALL") {
    const items = this.getIndividualWinners(filter);
    const map = new Map();
    items.forEach(item => {
      const key = item.playerId || item.playerName;
      if (!map.has(key)) {
        map.set(key, {
          playerId: item.playerId,
          playerName: item.playerName,
          count: 0
        });
      }
      map.get(key).count += 1;
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }

  getAggregatedTeamRounds(filter = "ALL") {
    const items = this.getTeamRounds(filter);
    const map = new Map();
    items.forEach(item => {
      const key = item.teamId || item.teamName;
      if (!map.has(key)) {
        map.set(key, {
          teamId: item.teamId,
          teamName: item.teamName,
          count: 0
        });
      }
      map.get(key).count += 1;
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }

  clearHistory() {
    this.mvps = [];
    this.individualWinners = [];
    this.teamRounds = [];
    this.recordedEvents.clear();
    localStorage.removeItem(STORAGE_KEY_MVPS);
    localStorage.removeItem(STORAGE_KEY_WINNERS);
    localStorage.removeItem(STORAGE_KEY_ROUNDS);
    eventBus.emit("history:cleared", {});
  }
}

export const historyEngine = new HistoryEngine();
