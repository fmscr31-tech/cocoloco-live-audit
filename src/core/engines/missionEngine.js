import { eventBus } from "../eventBus";
import { configManager } from "../configManager";

/**
 * Mission Engine: Handles dynamic stream missions and objectives (GIFT, CHAT, PARTICIPATION, TEAM).
 * Operates purely via eventBus and configManager without visual logic.
 */
class MissionEngine {
  constructor() {
    this.activeMissions = new Map();
    this.history = [];
    this.initListeners();
    this.initDefaultMissions();
  }

  initDefaultMissions() {
    // Create initial template missions
    this.createMission({
      id: "mission_roses_100",
      title: "Coleccionistas de Rosas",
      type: "GIFT",
      target: 100,
      current: 0,
      reward: "500 Puntos Bonus"
    });

    this.createMission({
      id: "mission_chat_50",
      title: "Chat Activo",
      type: "CHAT",
      target: 50,
      current: 0,
      reward: "MVP Badge"
    });

    this.createMission({
      id: "mission_participants_20",
      title: "Comunidad En Vivo",
      type: "PARTICIPATION",
      target: 20,
      current: 0,
      reward: "Boost de XP"
    });
  }

  initListeners() {
    eventBus.subscribe("reward:processed", (reward) => {
      this.activeMissions.forEach((mission, id) => {
        if (mission.type === "GIFT" && mission.status === "ACTIVE") {
          const increment = reward.points || 1;
          this.updateMissionProgress(id, increment);
        }
      });
    });

    eventBus.subscribe("player:updated", (player) => {
      this.activeMissions.forEach((mission, id) => {
        if (mission.type === "CHAT" && mission.status === "ACTIVE") {
          const increment = player.messages ? 1 : 0;
          if (increment > 0) {
            this.updateMissionProgress(id, increment);
          }
        }
      });
    });

    eventBus.subscribe("session:updated", (session) => {
      this.activeMissions.forEach((mission, id) => {
        if (mission.type === "PARTICIPATION" && mission.status === "ACTIVE") {
          const count = Object.keys(session.participants || {}).length;
          if (count !== mission.current) {
            const diff = count - mission.current;
            if (diff > 0) {
              this.updateMissionProgress(id, diff);
            }
          }
        }
      });
    });

    eventBus.subscribe("game:score_updated", (scorePayload) => {
      this.activeMissions.forEach((mission, id) => {
        if (mission.type === "TEAM" && mission.status === "ACTIVE") {
          const increment = scorePayload.pointsAdded || 0;
          this.updateMissionProgress(id, increment);
        }
      });
    });
  }

  createMission(missionData) {
    const mission = {
      id: missionData.id || `mission_${Date.now()}`,
      title: missionData.title || "Misión Live",
      type: missionData.type || "GIFT",
      target: missionData.target || 100,
      current: missionData.current || 0,
      reward: missionData.reward || "Recompensa",
      status: "ACTIVE",
      createdAt: Date.now()
    };

    this.activeMissions.set(mission.id, mission);
    eventBus.emit("mission:created", mission);
    return mission;
  }

  getActiveMissions() {
    return Array.from(this.activeMissions.values()).filter(m => m.status === "ACTIVE");
  }

  updateMissionProgress(missionId, amount) {
    const mission = this.activeMissions.get(missionId);
    if (!mission || mission.status !== "ACTIVE") return;

    mission.current = Math.min(mission.target, mission.current + amount);
    eventBus.emit("mission:updated", mission);

    if (mission.current >= mission.target) {
      this.completeMission(missionId);
    }
  }

  completeMission(missionId) {
    const mission = this.activeMissions.get(missionId);
    if (!mission || mission.status === "COMPLETED") return;

    mission.status = "COMPLETED";
    mission.completedAt = Date.now();
    this.activeMissions.delete(missionId);
    this.history.push(mission);

    eventBus.emit("mission:completed", mission);
    return mission;
  }

  getMissionHistory() {
    return [...this.history];
  }

  getMissionsState() {
    return {
      active: this.getActiveMissions(),
      history: this.getMissionHistory()
    };
  }
}

export const missionEngine = new MissionEngine();
