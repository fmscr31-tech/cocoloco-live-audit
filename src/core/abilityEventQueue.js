import { eventBus } from "./eventBus";
import { registrationManager } from "./registrationManager";
import "./abilityActionDispatcher";

const normalizeIdentity = (value) => String(value ?? "")
  .trim()
  .toLowerCase();

const identityValues = (item = {}) => [
  item.playerId,
  item.userId,
  item.tiktokId,
  item.uniqueId,
  item.username,
  item.nickname,
  item.displayName,
  item.name,
  item.sender,
  item.senderUsername,
  item.senderId,
  item?.player?.playerId,
  item?.player?.id,
  item?.player?.tiktokId,
  item?.player?.uniqueId,
  item?.player?.username,
  item?.player?.displayName,
  item?.giftEvent?.playerId,
  item?.giftEvent?.userId,
  item?.giftEvent?.tiktokId,
  item?.giftEvent?.uniqueId,
  item?.giftEvent?.username,
  item?.giftEvent?.displayName
].filter(Boolean).map(normalizeIdentity);

function resolveRegisteredPlayer(item = {}) {
  const keys = new Set(identityValues(item));
  if (!keys.size) return null;
  try {
    const players = registrationManager.getRegisteredPlayers?.() || [];
    return players.find(player => identityValues(player).some(key => keys.has(key))) || null;
  } catch (error) {
    console.warn("[AbilityEventQueue] Could not resolve registered player:", error);
    return null;
  }
}

function enrichAbilityPayload(payload = {}) {
  const registeredPlayer = resolveRegisteredPlayer(payload);
  const explicitTeamId = payload.teamId || payload.originalTeamId || payload.player?.teamId || payload.giftEvent?.teamId || null;
  const resolvedTeamId = explicitTeamId || registeredPlayer?.teamId || null;
  const playerId = payload.playerId || payload.userId || payload.tiktokId || payload.uniqueId || registeredPlayer?.playerId || null;
  const username = payload.username || payload.uniqueId || registeredPlayer?.username || null;
  const displayName = payload.displayName || payload.nickname || payload.player?.displayName || registeredPlayer?.displayName || username || "JUGADOR";

  return {
    ...payload,
    teamId: resolvedTeamId,
    playerId: playerId || payload.playerId || null,
    username: username || payload.username || null,
    displayName,
    sender: payload.sender || displayName,
    senderTeamId: resolvedTeamId,
    resolvedPlayerId: registeredPlayer?.playerId || playerId || null,
    resolvedTeamId,
    teamResolution: explicitTeamId ? "EVENT" : (registeredPlayer?.teamId ? "REGISTRATION" : "UNRESOLVED")
  };
}

class AbilityEventQueue {
  constructor() { this.queue=[]; this.currentPlaying=null; this.timerId=null; }

  enqueue(abilityPayload) {
    if (!abilityPayload) return;
    const enrichedPayload = enrichAbilityPayload(abilityPayload);
    const item = { ...enrichedPayload, priority: enrichedPayload.priority !== undefined ? enrichedPayload.priority : 0, timestamp: enrichedPayload.timestamp || Date.now(), executionId: enrichedPayload.executionId || `ability_${Date.now()}_${Math.random().toString(36).slice(2,10)}`, status:"queued" };
    console.log("[ABILITY QUEUED]", item);
    this.queue.push(item);
    this.queue.sort((a,b)=>b.priority!==a.priority?b.priority-a.priority:a.timestamp-b.timestamp);
    eventBus.publish("ability:queued", item);
    if (!this.currentPlaying) this.processNext();
  }

  processNext() {
    if (this.currentPlaying || this.queue.length===0) return;
    const item=this.queue.shift();
    item.status="playing";
    this.currentPlaying=item;
    console.log("[ABILITY STARTED]", item);
    eventBus.publish("ability:started", item);

    if (item.abilityId === "cocazo") {
      eventBus.publish("cocazo:trigger", { ...item, giftName:item.giftName||item.sourceGift||"Go Popular", canonicalGiftId:item.canonicalGiftId||"go_popular", source:"COCAZO" });
    }

    // queueDuration is deliberately independent from duration. A Freeze can
    // last five minutes in gameplay while its visual/audio trigger only blocks
    // the queue for a couple of seconds.
    const duration = Number(item.queueDuration || item.visualDuration || Math.min(Number(item.duration)||3000,5000));
    this.timerId=setTimeout(()=>this.finishCurrent(),Math.max(250,duration));
  }

  finishCurrent() {
    if (!this.currentPlaying) return;
    const finished={...this.currentPlaying,status:"removed"};
    eventBus.publish("ability:finished", finished);
    this.currentPlaying=null;
    if(this.timerId){clearTimeout(this.timerId);this.timerId=null;}
    this.processNext();
  }

  getCurrentPlaying(){return this.currentPlaying;}
  isPlaying(){return !!this.currentPlaying;}
  clear(){this.queue=[];if(this.timerId)clearTimeout(this.timerId);this.timerId=null;this.currentPlaying=null;eventBus.publish("ability:queue_cleared",{});}
}

export const abilityEventQueue=new AbilityEventQueue();
