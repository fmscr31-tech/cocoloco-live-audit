import { eventBus } from "./eventBus";
import { registrationManager } from "./registrationManager";
import { resetTeamSessionScores } from "./TeamManager";

const SESSION_STORAGE_KEY = "cocoloco_active_session";

class SessionManager {
  constructor() {
    this.currentSession = this.loadActiveSession() || this.createEmptySession();
    this.initListeners();

    // Team wins/points belong to the current LIVE. If the previous session is
    // not active, stale counters from an older browser session must not appear
    // as the first round of the new LIVE.
    if (!this.currentSession.isActive) {
      resetTeamSessionScores(true);
    }
  }

  createEmptySession() {
    return {
      sessionId: null,
      startTime: null,
      endTime: null,
      duration: 0,
      isActive: false,
      rounds: [],
      participants: {},
      eventsProcessed: 0,
      giftsReceived: 0,
      accumulatedPoints: 0,
      totalMessages: 0,
      totalLikes: 0,
      sessionSummary: {
        totalRounds: 0,
        totalPoints: 0,
        totalGifts: 0,
        totalParticipants: 0
      }
    };
  }

  archiveRound(roundData) {
    if (!this.currentSession.isActive) this.startSession();
    const roundRecord = {
      roundId: roundData.id || Date.now(),
      roundNumber: (this.currentSession.rounds || []).length + 1,
      roundName: roundData.name || "Ronda Principal",
      startTime: roundData.startTime || Date.now(),
      endTime: roundData.endTime || Date.now(),
      status: "finished",
      participantsSnapshot: JSON.parse(JSON.stringify(roundData.participants || [])),
      winner: roundData.winner || null,
      mvp: roundData.mvp || null,
      metrics: {
        totalPoints: roundData.totalPoints || 0,
        totalGifts: roundData.totalGifts || 0
      }
    };

    if (!this.currentSession.rounds) this.currentSession.rounds = [];
    this.currentSession.rounds.push(roundRecord);
    this.currentSession.sessionSummary = {
      totalRounds: this.currentSession.rounds.length,
      totalPoints: (this.currentSession.sessionSummary?.totalPoints || 0) + (roundData.totalPoints || 0),
      totalGifts: (this.currentSession.sessionSummary?.totalGifts || 0) + (roundData.totalGifts || 0),
      totalParticipants: Object.keys(this.currentSession.participants || {}).length
    };
    this.persistSession();
  }

  loadActiveSession() {
    try {
      const data = localStorage.getItem(SESSION_STORAGE_KEY);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  }

  persistSession() {
    try { localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(this.currentSession)); }
    catch (e) {}
  }

  startSession(customSessionId = null) {
    if (this.currentSession.isActive) return this.currentSession;

    const now = Date.now();
    this.currentSession = {
      sessionId: customSessionId || `session_${now}`,
      startTime: now,
      endTime: null,
      duration: 0,
      isActive: true,
      rounds: [],
      participants: {},
      eventsProcessed: 0,
      giftsReceived: 0,
      accumulatedPoints: 0,
      totalMessages: 0,
      totalLikes: 0,
      sessionSummary: { totalRounds: 0, totalPoints: 0, totalGifts: 0, totalParticipants: 0 }
    };

    resetTeamSessionScores(true);
    registrationManager.clearRegistration({ force: true, reason: "SESSION_STARTED" });

    this.persistSession();
    eventBus.emit("session:started", this.currentSession);
    return this.currentSession;
  }

  endSession() {
    if (!this.currentSession.isActive) return null;

    const now = Date.now();
    this.currentSession.endTime = now;
    this.currentSession.duration = now - this.currentSession.startTime;
    this.currentSession.isActive = false;

    resetTeamSessionScores(true);
    this.persistSession();
    eventBus.emit("session:ended", this.currentSession);
    registrationManager.clearRegistration({ force: true, reason: "SESSION_ENDED" });

    return { ...this.currentSession };
  }

  getSession() { return this.currentSession; }

  initListeners() {
    eventBus.subscribe("player:created", (player) => {
      if (!this.currentSession.isActive) return;
      this.currentSession.participants[player.userId || player.id] = player;
      this.currentSession.eventsProcessed += 1;
      this.persistSession();
      eventBus.emit("session:updated", this.currentSession);
    });

    eventBus.subscribe("player:updated", (player) => {
      if (!this.currentSession.isActive) return;
      this.currentSession.participants[player.userId || player.id] = player;
      this.currentSession.eventsProcessed += 1;
      let messages = 0;
      let likes = 0;
      let points = 0;
      Object.values(this.currentSession.participants).forEach(p => {
        messages += p.messages || 0;
        likes += p.likes || 0;
        points += p.points || 0;
      });
      this.currentSession.totalMessages = messages;
      this.currentSession.totalLikes = likes;
      this.currentSession.accumulatedPoints = points;
      this.persistSession();
      eventBus.emit("session:updated", this.currentSession);
    });

    eventBus.subscribe("reward:processed", (reward) => {
      if (!this.currentSession.isActive) return;
      this.currentSession.giftsReceived += 1;
      this.currentSession.eventsProcessed += 1;
      this.persistSession();
      eventBus.emit("session:updated", this.currentSession);
    });
  }
}

export const sessionManager = new SessionManager();
