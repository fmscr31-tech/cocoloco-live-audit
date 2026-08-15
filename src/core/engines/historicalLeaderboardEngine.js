import { sessionManager } from "../sessionManager";
import { configManager } from "../configManager";

/**
 * Historical Leaderboard Engine v3 (Timezone-Aware & Global Records & Hall of Fame)
 * Pure derivation engine operating read-only on immutable session round snapshots (`session.rounds`).
 * Uses centralized statistical timezone (default "America/Costa_Rica") and business date resolution.
 */
class HistoricalLeaderboardEngine {
  constructor() {
    this.DEFAULT_TIMEZONE = "America/Costa_Rica";
  }

  getTimezone() {
    try {
      const configured = configManager.get("session.timezone");
      if (configured && typeof configured === "string") {
        return configured;
      }
    } catch (e) {
      // fallback
    }
    return this.DEFAULT_TIMEZONE;
  }

  getBusinessDate(timestamp) {
    const time = timestamp || Date.now();
    const tz = this.getTimezone();
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    });
    return formatter.format(new Date(time));
  }

  getWeekBounds(refDate = new Date()) {
    const tz = this.getTimezone();
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      year: "numeric",
      month: "numeric",
      day: "numeric"
    });
    const parts = formatter.formatToParts(new Date(refDate));
    const year = parseInt(parts.find(p => p.type === "year").value, 10);
    const month = parseInt(parts.find(p => p.type === "month").value, 10) - 1;
    const day = parseInt(parts.find(p => p.type === "day").value, 10);

    const d = new Date(year, month, day);
    const weekday = d.getDay();
    const diff = d.getDate() - weekday + (weekday === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    return { start: monday.getTime(), end: sunday.getTime() };
  }

  getSessionLeaderboard(session) {
    if (!session || !session.rounds || !Array.isArray(session.rounds)) {
      return { individual: [], team: [] };
    }

    const individualMap = new Map();
    const teamMap = new Map();

    session.rounds.forEach(round => {
      const mode = String(round.gameMode || "TEAM").toUpperCase();
      const participants = round.participantsSnapshot || [];
      const winner = round.winner;
      const mvp = round.mvp;

      if (mode === "INDIVIDUAL") {
        participants.forEach(p => {
          const pid = p.playerId || p.id || p.username;
          if (!pid) return;

          if (!individualMap.has(pid)) {
            individualMap.set(pid, {
              playerId: pid,
              displayName: p.displayName || p.name || p.username || pid,
              username: p.username || p.displayName || p.name || pid,
              totalPoints: 0,
              roundsPlayed: 0,
              roundsWon: 0,
              mvpCount: 0,
              bestRoundScore: -Infinity,
              totalGifts: 0,
              averageRoundScore: 0
            });
          }

          const entry = individualMap.get(pid);
          const pts = Number(p.points || 0);
          entry.totalPoints += pts;
          entry.roundsPlayed += 1;
          entry.totalGifts += Number(p.gifts || 0);

          if (pts > entry.bestRoundScore) {
            entry.bestRoundScore = pts;
          }

          if (winner && (winner.id === pid || winner.playerId === pid || String(winner.name).toLowerCase() === String(entry.displayName).toLowerCase())) {
            entry.roundsWon += 1;
          }

          if (mvp && (mvp.id === pid || mvp.playerId === pid || String(mvp.name).toLowerCase() === String(entry.displayName).toLowerCase())) {
            entry.mvpCount += 1;
          }
        });
      } else if (mode === "TEAM") {
        const teamRoundScores = {};
        participants.forEach(p => {
          const tid = p.teamId || "unassigned";
          if (!teamRoundScores[tid]) {
            teamRoundScores[tid] = { points: 0, gifts: 0, players: 0 };
          }
          teamRoundScores[tid].points += Number(p.points || 0);
          teamRoundScores[tid].gifts += Number(p.gifts || 0);
          teamRoundScores[tid].players += 1;
        });

        Object.entries(teamRoundScores).forEach(([tid, data]) => {
          if (!teamMap.has(tid)) {
            teamMap.set(tid, {
              teamId: tid,
              teamName: tid.toUpperCase(),
              totalPoints: 0,
              roundsPlayed: 0,
              roundsWon: 0,
              mvpCount: 0,
              bestRoundScore: -Infinity,
              totalGifts: 0,
              averageRoundScore: 0
            });
          }

          const entry = teamMap.get(tid);
          entry.totalPoints += data.points;
          entry.roundsPlayed += 1;
          entry.totalGifts += data.gifts;

          if (data.points > entry.bestRoundScore) {
            entry.bestRoundScore = data.points;
          }

          if (winner && (winner.id === tid || String(winner.name).toLowerCase() === String(entry.teamName).toLowerCase())) {
            entry.roundsWon += 1;
          }

          if (mvp && (mvp.teamId === tid)) {
            entry.mvpCount += 1;
          }
        });
      }
    });

    const individualArr = Array.from(individualMap.values()).map(e => ({
      ...e,
      bestRoundScore: e.bestRoundScore === -Infinity ? 0 : e.bestRoundScore,
      averageRoundScore: e.roundsPlayed > 0 ? Number((e.totalPoints / e.roundsPlayed).toFixed(2)) : 0
    }));

    const teamArr = Array.from(teamMap.values()).map(e => ({
      ...e,
      bestRoundScore: e.bestRoundScore === -Infinity ? 0 : e.bestRoundScore,
      averageRoundScore: e.roundsPlayed > 0 ? Number((e.totalPoints / e.roundsPlayed).toFixed(2)) : 0
    }));

    const sortFn = (a, b) => {
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      if (b.roundsWon !== a.roundsWon) return b.roundsWon - a.roundsWon;
      if (b.mvpCount !== a.mvpCount) return b.mvpCount - a.mvpCount;
      if (b.bestRoundScore !== a.bestRoundScore) return b.bestRoundScore - a.bestRoundScore;
      return String(a.displayName || a.teamName).localeCompare(String(b.displayName || b.teamName));
    };

    individualArr.sort(sortFn);
    teamArr.sort(sortFn);

    return {
      individual: individualArr,
      team: teamArr
    };
  }

  getDailyLeaderboard(dateStr, allSessions = []) {
    const filtered = allSessions.filter(s => {
      const sDate = this.getBusinessDate(s.startTime);
      return sDate === dateStr;
    });
    return this.aggregateSessions(filtered);
  }

  getWeeklyLeaderboard(refDate = new Date(), allSessions = []) {
    const bounds = this.getWeekBounds(refDate);
    const filtered = allSessions.filter(s => {
      const time = s.startTime || 0;
      return time >= bounds.start && time <= bounds.end;
    });
    return this.aggregateSessions(filtered);
  }

  getMonthlyLeaderboard(year, month, allSessions = []) {
    const prefix = `${year}-${String(month).padStart(2, "0")}`;
    const filtered = allSessions.filter(s => {
      const sDate = this.getBusinessDate(s.startTime);
      return sDate.startsWith(prefix);
    });
    return this.aggregateSessions(filtered);
  }

  aggregateSessions(sessions = []) {
    const combinedIndividual = new Map();
    const combinedTeam = new Map();

    sessions.forEach(session => {
      const lb = this.getSessionLeaderboard(session);

      lb.individual.forEach(ind => {
        const key = ind.playerId;
        if (!combinedIndividual.has(key)) {
          combinedIndividual.set(key, { ...ind });
        } else {
          const existing = combinedIndividual.get(key);
          existing.totalPoints += ind.totalPoints;
          existing.roundsPlayed += ind.roundsPlayed;
          existing.roundsWon += ind.roundsWon;
          existing.mvpCount += ind.mvpCount;
          existing.totalGifts += ind.totalGifts;
          if (ind.bestRoundScore > existing.bestRoundScore) {
            existing.bestRoundScore = ind.bestRoundScore;
          }
        }
      });

      lb.team.forEach(tm => {
        const key = tm.teamId;
        if (!combinedTeam.has(key)) {
          combinedTeam.set(key, { ...tm });
        } else {
          const existing = combinedTeam.get(key);
          existing.totalPoints += tm.totalPoints;
          existing.roundsPlayed += tm.roundsPlayed;
          existing.roundsWon += tm.roundsWon;
          existing.mvpCount += tm.mvpCount;
          existing.totalGifts += tm.totalGifts;
          if (tm.bestRoundScore > existing.bestRoundScore) {
            existing.bestRoundScore = tm.bestRoundScore;
          }
        }
      });
    });

    const individualArr = Array.from(combinedIndividual.values()).map(e => ({
      ...e,
      averageRoundScore: e.roundsPlayed > 0 ? Number((e.totalPoints / e.roundsPlayed).toFixed(2)) : 0
    }));

    const teamArr = Array.from(combinedTeam.values()).map(e => ({
      ...e,
      averageRoundScore: e.roundsPlayed > 0 ? Number((e.totalPoints / e.roundsPlayed).toFixed(2)) : 0
    }));

    const sortFn = (a, b) => {
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      if (b.roundsWon !== a.roundsWon) return b.roundsWon - a.roundsWon;
      if (b.mvpCount !== a.mvpCount) return b.mvpCount - a.mvpCount;
      if (b.bestRoundScore !== a.bestRoundScore) return b.bestRoundScore - a.bestRoundScore;
      return String(a.displayName || a.teamName).localeCompare(String(b.displayName || b.teamName));
    };

    individualArr.sort(sortFn);
    teamArr.sort(sortFn);

    return {
      individual: individualArr,
      team: teamArr
    };
  }

  /**
   * Dedicated read-only method deriving global historical records exclusively from immutable session.rounds.
   * Strictly enforces mode separation (INDIVIDUAL vs TEAM).
   */
  getGlobalRecords(allSessions = []) {
    const indProfiles = new Map(); // playerId -> aggregated stats
    const teamProfiles = new Map(); // teamId -> aggregated stats

    let highestRoundInd = { value: -Infinity, playerId: null, displayName: null, mode: "INDIVIDUAL", sessionId: null, roundId: null, period: "ROUND", timestamp: null };
    let highestRoundTeam = { value: -Infinity, teamId: null, teamName: null, mode: "TEAM", sessionId: null, roundId: null, period: "ROUND", timestamp: null };

    // Track session totals
    const sessionTotalsInd = new Map(); // sessionId -> Map(playerId -> totalPoints)
    const sessionTotalsTeam = new Map(); // sessionId -> Map(teamId -> totalPoints)

    // Track daily totals (business date)
    const dailyTotalsInd = new Map(); // businessDate -> Map(playerId -> totalPoints)
    const dailyTotalsTeam = new Map(); // businessDate -> Map(teamId -> totalPoints)

    // Track weekly totals
    const weeklyTotalsInd = new Map(); // weekKey -> Map(playerId -> totalPoints)
    const weeklyTotalsTeam = new Map(); // weekKey -> Map(teamId -> totalPoints)

    // Track monthly totals
    const monthlyTotalsInd = new Map(); // monthKey -> Map(playerId -> totalPoints)
    const monthlyTotalsTeam = new Map(); // monthKey -> Map(teamId -> totalPoints)

    allSessions.forEach(session => {
      if (!session || !session.rounds || !Array.isArray(session.rounds)) return;
      const sessId = session.sessionId || session.id || "unknown_session";
      const sDate = this.getBusinessDate(session.startTime);
      const weekBounds = this.getWeekBounds(session.startTime || Date.now());
      const weekKey = `${weekBounds.start}-${weekBounds.end}`;
      const monthKey = sDate.substring(0, 7);

      session.rounds.forEach(round => {
        const mode = String(round.gameMode || "TEAM").toUpperCase();
        const participants = round.participantsSnapshot || [];
        const winner = round.winner;
        const mvp = round.mvp;
        const roundId = round.roundId || round.id;
        const roundTime = round.endTime || round.startTime || session.startTime || Date.now();

        if (mode === "INDIVIDUAL") {
          const roundIndPoints = new Map();

          participants.forEach(p => {
            const pid = p.playerId || p.id || p.username;
            if (!pid) return;
            const pts = Number(p.points || 0);
            roundIndPoints.set(pid, pts);

            if (!indProfiles.has(pid)) {
              indProfiles.set(pid, {
                playerId: pid,
                displayName: p.displayName || p.name || p.username || pid,
                totalPoints: 0,
                roundsPlayed: 0,
                roundsWon: 0,
                mvpCount: 0,
                bestRoundScore: -Infinity
              });
            }
            const profile = indProfiles.get(pid);
            profile.totalPoints += pts;
            profile.roundsPlayed += 1;
            if (pts > profile.bestRoundScore) {
              profile.bestRoundScore = pts;
            }

            if (winner && (winner.id === pid || winner.playerId === pid || String(winner.name).toLowerCase() === String(profile.displayName).toLowerCase())) {
              profile.roundsWon += 1;
            }
            if (mvp && (mvp.id === pid || mvp.playerId === pid || String(mvp.name).toLowerCase() === String(profile.displayName).toLowerCase())) {
              profile.mvpCount += 1;
            }

            // Session total accumulator
            if (!sessionTotalsInd.has(sessId)) sessionTotalsInd.set(sessId, new Map());
            const sMap = sessionTotalsInd.get(sessId);
            sMap.set(pid, (sMap.get(pid) || 0) + pts);

            // Daily accumulator
            if (!dailyTotalsInd.has(sDate)) dailyTotalsInd.set(sDate, new Map());
            const dMap = dailyTotalsInd.get(sDate);
            dMap.set(pid, (dMap.get(pid) || 0) + pts);

            // Weekly accumulator
            if (!weeklyTotalsInd.has(weekKey)) weeklyTotalsInd.set(weekKey, new Map());
            const wMap = weeklyTotalsInd.get(weekKey);
            wMap.set(pid, (wMap.get(pid) || 0) + pts);

            // Monthly accumulator
            if (!monthlyTotalsInd.has(monthKey)) monthlyTotalsInd.set(monthKey, new Map());
            const mMap = monthlyTotalsInd.get(monthKey);
            mMap.set(pid, (mMap.get(pid) || 0) + pts);

            // Highest round score
            if (pts > highestRoundInd.value || (pts === highestRoundInd.value && profile.displayName.localeCompare(highestRoundInd.displayName || "") < 0)) {
              highestRoundInd = {
                value: pts,
                playerId: pid,
                displayName: profile.displayName,
                mode: "INDIVIDUAL",
                sessionId: sessId,
                roundId,
                period: "ROUND",
                timestamp: roundTime
              };
            }
          });
        } else if (mode === "TEAM") {
          const teamRoundScores = {};
          participants.forEach(p => {
            const tid = p.teamId || "unassigned";
            teamRoundScores[tid] = (teamRoundScores[tid] || 0) + Number(p.points || 0);
          });

          Object.entries(teamRoundScores).forEach(([tid, pts]) => {
            if (!teamProfiles.has(tid)) {
              teamProfiles.set(tid, {
                teamId: tid,
                teamName: tid.toUpperCase(),
                totalPoints: 0,
                roundsPlayed: 0,
                roundsWon: 0,
                mvpCount: 0,
                bestRoundScore: -Infinity
              });
            }
            const profile = teamProfiles.get(tid);
            profile.totalPoints += pts;
            profile.roundsPlayed += 1;
            if (pts > profile.bestRoundScore) {
              profile.bestRoundScore = pts;
            }

            if (winner && (winner.id === tid || String(winner.name).toLowerCase() === String(profile.teamName).toLowerCase())) {
              profile.roundsWon += 1;
            }
            if (mvp && (mvp.teamId === tid)) {
              profile.mvpCount += 1;
            }

            // Session total accumulator
            if (!sessionTotalsTeam.has(sessId)) sessionTotalsTeam.set(sessId, new Map());
            const sMap = sessionTotalsTeam.get(sessId);
            sMap.set(tid, (sMap.get(tid) || 0) + pts);

            // Daily accumulator
            if (!dailyTotalsTeam.has(sDate)) dailyTotalsTeam.set(sDate, new Map());
            const dMap = dailyTotalsTeam.get(sDate);
            dMap.set(tid, (dMap.get(tid) || 0) + pts);

            // Weekly accumulator
            if (!weeklyTotalsTeam.has(weekKey)) weeklyTotalsTeam.set(weekKey, new Map());
            const wMap = weeklyTotalsTeam.get(weekKey);
            wMap.set(tid, (wMap.get(tid) || 0) + pts);

            // Monthly accumulator
            if (!monthlyTotalsTeam.has(monthKey)) monthlyTotalsTeam.set(monthKey, new Map());
            const mMap = monthlyTotalsTeam.get(monthKey);
            mMap.set(tid, (mMap.get(tid) || 0) + pts);

            // Highest round score
            if (pts > highestRoundTeam.value || (pts === highestRoundTeam.value && profile.teamName.localeCompare(highestRoundTeam.teamName || "") < 0)) {
              highestRoundTeam = {
                value: pts,
                teamId: tid,
                teamName: profile.teamName,
                mode: "TEAM",
                sessionId: sessId,
                roundId,
                period: "ROUND",
                timestamp: roundTime
              };
            }
          });
        }
      });
    });

    const indArr = Array.from(indProfiles.values());
    const teamArr = Array.from(teamProfiles.values());

    // Helper to find top record with deterministic tie-breaking
    const findTopRecord = (items, valFn, nameFn, identityKeyFn, mode, period) => {
      let maxVal = -Infinity;
      let topItem = null;

      items.forEach(item => {
        const val = valFn(item);
        const name = nameFn(item);
        if (val > maxVal || (val === maxVal && topItem && name.localeCompare(nameFn(topItem)) < 0)) {
          maxVal = val;
          topItem = item;
        }
      });

      if (!topItem || maxVal === -Infinity) {
        return {
          value: 0,
          [mode === "INDIVIDUAL" ? "playerId" : "teamId"]: null,
          [mode === "INDIVIDUAL" ? "displayName" : "teamName"]: null,
          mode,
          period,
          timestamp: Date.now()
        };
      }

      const res = {
        value: maxVal,
        mode,
        period,
        timestamp: Date.now()
      };
      if (mode === "INDIVIDUAL") {
        res.playerId = topItem.playerId;
        res.displayName = topItem.displayName;
      } else {
        res.teamId = topItem.teamId;
        res.teamName = topItem.teamName;
      }
      return res;
    };

    const mostRoundWinsInd = findTopRecord(indArr, i => i.roundsWon, i => i.displayName, i => i.playerId, "INDIVIDUAL", "GLOBAL");
    const mostMVPsInd = findTopRecord(indArr, i => i.mvpCount, i => i.displayName, i => i.playerId, "INDIVIDUAL", "GLOBAL");
    const mostRoundsPlayedInd = findTopRecord(indArr, i => i.roundsPlayed, i => i.displayName, i => i.playerId, "INDIVIDUAL", "GLOBAL");
    const bestAverageRoundScoreInd = findTopRecord(indArr, i => i.roundsPlayed > 0 ? Number((i.totalPoints / i.roundsPlayed).toFixed(2)) : 0, i => i.displayName, i => i.playerId, "INDIVIDUAL", "GLOBAL");

    const mostRoundWinsTeam = findTopRecord(teamArr, t => t.roundsWon, t => t.teamName, t => t.teamId, "TEAM", "GLOBAL");
    const mostMVPsTeam = findTopRecord(teamArr, t => t.mvpCount, t => t.teamName, t => t.teamId, "TEAM", "GLOBAL");
    const mostRoundsPlayedTeam = findTopRecord(teamArr, t => t.roundsPlayed, t => t.teamName, t => t.teamId, "TEAM", "GLOBAL");
    const bestAverageRoundScoreTeam = findTopRecord(teamArr, t => t.roundsPlayed > 0 ? Number((t.totalPoints / t.roundsPlayed).toFixed(2)) : 0, t => t.teamName, t => t.teamId, "TEAM", "GLOBAL");

    // Highest Session Total
    let highestSessionTotalInd = { value: 0, playerId: null, displayName: null, mode: "INDIVIDUAL", sessionId: null, period: "SESSION", timestamp: Date.now() };
    sessionTotalsInd.forEach((sMap, sessId) => {
      sMap.forEach((pts, pid) => {
        const p = indProfiles.get(pid);
        const name = p ? p.displayName : pid;
        if (pts > highestSessionTotalInd.value) {
          highestSessionTotalInd = {
            value: pts,
            playerId: pid,
            displayName: name,
            mode: "INDIVIDUAL",
            sessionId: sessId,
            period: "SESSION",
            timestamp: Date.now()
          };
        }
      });
    });

    let highestSessionTotalTeam = { value: 0, teamId: null, teamName: null, mode: "TEAM", sessionId: null, period: "SESSION", timestamp: Date.now() };
    sessionTotalsTeam.forEach((sMap, sessId) => {
      sMap.forEach((pts, tid) => {
        const t = teamProfiles.get(tid);
        const name = t ? t.teamName : tid;
        if (pts > highestSessionTotalTeam.value) {
          highestSessionTotalTeam = {
            value: pts,
            teamId: tid,
            teamName: name,
            mode: "TEAM",
            sessionId: sessId,
            period: "SESSION",
            timestamp: Date.now()
          };
        }
      });
    });

    // Highest Daily Total
    let highestDailyTotalInd = { value: 0, playerId: null, displayName: null, mode: "INDIVIDUAL", period: null, timestamp: Date.now() };
    dailyTotalsInd.forEach((dMap, dateStr) => {
      dMap.forEach((pts, pid) => {
        const p = indProfiles.get(pid);
        const name = p ? p.displayName : pid;
        if (pts > highestDailyTotalInd.value) {
          highestDailyTotalInd = {
            value: pts,
            playerId: pid,
            displayName: name,
            mode: "INDIVIDUAL",
            period: dateStr,
            timestamp: Date.now()
          };
        }
      });
    });

    let highestDailyTotalTeam = { value: 0, teamId: null, teamName: null, mode: "TEAM", period: null, timestamp: Date.now() };
    dailyTotalsTeam.forEach((dMap, dateStr) => {
      dMap.forEach((pts, tid) => {
        const t = teamProfiles.get(tid);
        const name = t ? t.teamName : tid;
        if (pts > highestDailyTotalTeam.value) {
          highestDailyTotalTeam = {
            value: pts,
            teamId: tid,
            teamName: name,
            mode: "TEAM",
            period: dateStr,
            timestamp: Date.now()
          };
        }
      });
    });

    // Highest Weekly Total
    let highestWeeklyTotalInd = { value: 0, playerId: null, displayName: null, mode: "INDIVIDUAL", period: null, timestamp: Date.now() };
    weeklyTotalsInd.forEach((wMap, wKey) => {
      wMap.forEach((pts, pid) => {
        const p = indProfiles.get(pid);
        const name = p ? p.displayName : pid;
        if (pts > highestWeeklyTotalInd.value) {
          highestWeeklyTotalInd = {
            value: pts,
            playerId: pid,
            displayName: name,
            mode: "INDIVIDUAL",
            period: wKey,
            timestamp: Date.now()
          };
        }
      });
    });

    let highestWeeklyTotalTeam = { value: 0, teamId: null, teamName: null, mode: "TEAM", period: null, timestamp: Date.now() };
    weeklyTotalsTeam.forEach((wMap, wKey) => {
      wMap.forEach((pts, tid) => {
        const t = teamProfiles.get(tid);
        const name = t ? t.teamName : tid;
        if (pts > highestWeeklyTotalTeam.value) {
          highestWeeklyTotalTeam = {
            value: pts,
            teamId: tid,
            teamName: name,
            mode: "TEAM",
            period: wKey,
            timestamp: Date.now()
          };
        }
      });
    });

    // Highest Monthly Total
    let highestMonthlyTotalInd = { value: 0, playerId: null, displayName: null, mode: "INDIVIDUAL", period: null, timestamp: Date.now() };
    monthlyTotalsInd.forEach((mMap, mKey) => {
      mMap.forEach((pts, pid) => {
        const p = indProfiles.get(pid);
        const name = p ? p.displayName : pid;
        if (pts > highestMonthlyTotalInd.value) {
          highestMonthlyTotalInd = {
            value: pts,
            playerId: pid,
            displayName: name,
            mode: "INDIVIDUAL",
            period: mKey,
            timestamp: Date.now()
          };
        }
      });
    });

    let highestMonthlyTotalTeam = { value: 0, teamId: null, teamName: null, mode: "TEAM", period: null, timestamp: Date.now() };
    monthlyTotalsTeam.forEach((mMap, mKey) => {
      mMap.forEach((pts, tid) => {
        const t = teamProfiles.get(tid);
        const name = t ? t.teamName : tid;
        if (pts > highestMonthlyTotalTeam.value) {
          highestMonthlyTotalTeam = {
            value: pts,
            teamId: tid,
            teamName: name,
            mode: "TEAM",
            period: mKey,
            timestamp: Date.now()
          };
        }
      });
    });

    return {
      individual: {
        highestRoundScore: {
          value: highestRoundInd.value === -Infinity ? 0 : highestRoundInd.value,
          playerId: highestRoundInd.playerId,
          displayName: highestRoundInd.displayName,
          mode: "INDIVIDUAL",
          sessionId: highestRoundInd.sessionId,
          roundId: highestRoundInd.roundId,
          period: "ROUND",
          timestamp: highestRoundInd.timestamp
        },
        mostRoundWins: mostRoundWinsInd,
        mostMVPs: mostMVPsInd,
        highestSessionTotal: highestSessionTotalInd,
        highestDailyTotal: highestDailyTotalInd,
        highestWeeklyTotal: highestWeeklyTotalInd,
        highestMonthlyTotal: highestMonthlyTotalInd,
        mostRoundsPlayed: mostRoundsPlayedInd,
        bestAverageRoundScore: bestAverageRoundScoreInd
      },
      team: {
        highestRoundScore: {
          value: highestRoundTeam.value === -Infinity ? 0 : highestRoundTeam.value,
          teamId: highestRoundTeam.teamId,
          teamName: highestRoundTeam.teamName,
          mode: "TEAM",
          sessionId: highestRoundTeam.sessionId,
          roundId: highestRoundTeam.roundId,
          period: "ROUND",
          timestamp: highestRoundTeam.timestamp
        },
        mostRoundWins: mostRoundWinsTeam,
        mostMVPs: mostMVPsTeam,
        highestSessionTotal: highestSessionTotalTeam,
        highestDailyTotal: highestDailyTotalTeam,
        highestWeeklyTotal: highestWeeklyTotalTeam,
        highestMonthlyTotal: highestMonthlyTotalTeam,
        mostRoundsPlayed: mostRoundsPlayedTeam,
        bestAverageRoundScore: bestAverageRoundScoreTeam
      }
    };
  }
}

export const historicalLeaderboardEngine = new HistoricalLeaderboardEngine();
