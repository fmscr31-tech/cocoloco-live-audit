import { eventBus } from "./eventBus.js";
import { giftResolver } from "./giftResolver.js";
import { giftActionDispatcher } from "./giftActionDispatcher.js";
import { giftAbilityResolver } from "./giftAbilityResolver.js";
import { abilityEventQueue } from "./abilityEventQueue.js";
import { resolveCanonicalGiftId } from "../config/canonicalGifts.js";

class GiftEventBridge {
  constructor() { this.liveInputEnabled = true; this.processedEvents = new Map(); this.maxCacheSize = 1000; this.initPipelineListener(); }
  enableLiveInput() { this.liveInputEnabled = true; }
  disableLiveInput() { this.liveInputEnabled = false; }
  isLiveInputEnabled() { return this.liveInputEnabled; }
  _cleanCache() { if (this.processedEvents.size <= this.maxCacheSize) return; const keys = Array.from(this.processedEvents.keys()); for (let i=0;i<200&&i<keys.length;i++) this.processedEvents.delete(keys[i]); }
  _isStreakIntermediate(rawPayload, data, giftObj) {
    const repeatEnd = rawPayload.repeatEnd ?? rawPayload.repeat_end ?? data.repeatEnd ?? data.repeat_end ?? giftObj.repeatEnd ?? giftObj.repeat_end;
    const streaking = rawPayload.streaking ?? rawPayload.isRepeating ?? rawPayload.is_repeating ?? data.streaking ?? data.isRepeating ?? data.is_repeating ?? giftObj.streaking ?? giftObj.isRepeating ?? giftObj.is_repeating;
    const giftType = Number(rawPayload.giftType ?? rawPayload.gift_type ?? data.giftType ?? data.gift_type ?? giftObj.type ?? giftObj.giftType ?? giftObj.gift_type);
    return streaking === true || streaking === 1 || streaking === "1" || (giftType === 1 && (repeatEnd === false || repeatEnd === 0 || repeatEnd === "0"));
  }
  initPipelineListener() {
    eventBus.subscribe("normalized:gift", normalizedEvent => {
      const canonicalId = normalizedEvent.canonicalGiftId || normalizedEvent.giftId;
      const scoringAction = giftResolver.resolveGiftEvent({ giftId: canonicalId, giftName: normalizedEvent.giftName, username: normalizedEvent.username, quantity: normalizedEvent.quantity || 1 }, "context");
      let scoringResult = null;
      if (scoringAction && ["add points","points"].includes(String(scoringAction.action || "").trim().toLowerCase())) {
        scoringResult = giftActionDispatcher.dispatch({ ...scoringAction, username: normalizedEvent.username, team: normalizedEvent.teamId || scoringAction.team });
      }
      const abilityPayload = giftAbilityResolver.resolveGiftToAbility({
        giftId: normalizedEvent.giftId, giftName: normalizedEvent.giftName || canonicalId, canonicalGiftId: canonicalId,
        playerId: normalizedEvent.playerId, userId: normalizedEvent.userId, username: normalizedEvent.username,
        displayName: normalizedEvent.displayName, avatar: normalizedEvent.avatar, teamId: normalizedEvent.teamId,
        duration: normalizedEvent.duration, quantity: normalizedEvent.quantity || 1, repeatCount: normalizedEvent.quantity || 1,
        repeatEnd: normalizedEvent.repeatEnd, streaking: normalizedEvent.streaking, giftType: normalizedEvent.giftType, eventId: normalizedEvent.eventId
      });
      if (abilityPayload) abilityEventQueue.enqueue({ ...abilityPayload, canonicalGiftId: canonicalId, giftId: normalizedEvent.giftId, giftName: normalizedEvent.giftName, playerId: normalizedEvent.playerId, userId: normalizedEvent.userId, username: normalizedEvent.username, displayName: normalizedEvent.displayName, avatar: normalizedEvent.avatar, quantity: normalizedEvent.quantity, repeatCount: normalizedEvent.quantity, repeatEnd: normalizedEvent.repeatEnd, streaking: normalizedEvent.streaking, giftType: normalizedEvent.giftType, eventId: normalizedEvent.eventId });
      if (abilityPayload || scoringResult) {
        eventBus.emit("gift:action_dispatched", { type:"GIFT", source:normalizedEvent, result:abilityPayload, scoreResult:scoringResult, canonicalGiftId:canonicalId, timestamp:Date.now() });
        eventBus.emit("gift:processed", { type:"GIFT", source:normalizedEvent, result:abilityPayload, scoreResult:scoringResult, timestamp:Date.now() });
      }
    });
  }
  processExternalGift(rawPayload = {}) {
    const data = rawPayload.data || rawPayload; const giftObj = data.gift || {}; const source = rawPayload.source || data.source || "EXTERNAL_CONNECTOR"; const isSimulator = String(source).toLowerCase().includes("simulator");
    if (!isSimulator && !this.liveInputEnabled) return null;
    if (this._isStreakIntermediate(rawPayload,data,giftObj)) { eventBus.emit("gift:streak_progress", { type:"GIFT_STREAK_PROGRESS", giftId:rawPayload.giftId||rawPayload.gift_id||data.giftId||data.gift_id||giftObj.id||null, giftName:rawPayload.giftName||rawPayload.gift_name||data.giftName||data.gift_name||giftObj.name||null, quantity:Math.max(1,Number(rawPayload.quantity||data.repeatCount||data.repeat_count||data.count||data.quantity||giftObj.repeatCount||giftObj.repeat_count||1)), username:rawPayload.username||rawPayload.uniqueId||data.uniqueId||data.username||"Viewer", displayName:rawPayload.displayName||data.displayName||data.nickname||null, eventId:rawPayload.eventId||rawPayload.eventID||data.eventId||data.eventID||rawPayload.msgId||rawPayload.messageID||data.msgId||data.messageID||null, repeatEnd:rawPayload.repeatEnd??rawPayload.repeat_end??data.repeatEnd??data.repeat_end??giftObj.repeatEnd??giftObj.repeat_end, streaking:rawPayload.streaking??rawPayload.isRepeating??rawPayload.is_repeating??data.streaking??data.isRepeating??data.is_repeating??giftObj.streaking??giftObj.isRepeating??giftObj.is_repeating, source, timestamp:Date.now() }); return null; }
    const nativeId = rawPayload.eventId||rawPayload.eventID||rawPayload.msgId||rawPayload.messageID||rawPayload.transactionId||rawPayload.transactionID||data.eventId||data.eventID||data.msgId||data.messageID||data.transactionId||data.transactionID||data.id;
    if (nativeId) { const dedupKey=`${source}_${nativeId}`; this._cleanCache(); if (this.processedEvents.has(dedupKey)) return null; this.processedEvents.set(dedupKey,Date.now()); }
    const giftId=rawPayload.giftId||rawPayload.gift_id||data.giftId||data.gift_id||giftObj.id||giftObj.gift_id||null;
    let giftName=rawPayload.giftName||rawPayload.gift_name||rawPayload.name||data.giftName||data.gift_name||data.name||data.giftDisplayName||data.title||giftObj.name||giftObj.giftName||giftObj.gift_name||giftObj.title||null;
    if (giftName && /^\d+$/.test(String(giftName).trim())) giftName=null;
    const canonical=resolveCanonicalGiftId({giftId,giftName,rawInput:rawPayload.rawInput||data.rawInput});
    const canonicalGiftId=canonical?canonical.canonicalId:(giftName?String(giftName).trim().toLowerCase():(giftId?String(giftId).trim().toLowerCase():""));
    if (!canonicalGiftId) return null;
    const actualGiftName=canonical?canonical.display.name:(giftName||giftId||"Unknown Gift");
    const quantity=Math.max(1,Number(rawPayload.quantity||data.repeatCount||data.repeat_count||data.count||data.quantity||giftObj.repeatCount||giftObj.repeat_count||1));
    const playerId=rawPayload.playerId||rawPayload.userId||data.playerId||data.userId||data.uniqueId||rawPayload.uniqueId||rawPayload.username||"";
    const username=rawPayload.username||rawPayload.uniqueId||data.uniqueId||data.username||data.tikfinityUsername||"Viewer";
    const displayName=rawPayload.displayName||data.displayName||data.nickname||username;
    const userId=rawPayload.userId||data.userId||playerId;
    const avatar=rawPayload.avatar||rawPayload.profilePictureUrl||data.avatar||data.profilePictureUrl||"";
    const repeatEnd=rawPayload.repeatEnd??rawPayload.repeat_end??data.repeatEnd??data.repeat_end??giftObj.repeatEnd??giftObj.repeat_end;
    const streaking=rawPayload.streaking??rawPayload.isRepeating??rawPayload.is_repeating??data.streaking??data.isRepeating??data.is_repeating??giftObj.streaking??giftObj.isRepeating??giftObj.is_repeating;
    const giftType=rawPayload.giftType??rawPayload.gift_type??data.giftType??data.gift_type??giftObj.type??giftObj.giftType??giftObj.gift_type;
    const normalized={ type:"GIFT", giftId:giftId||canonicalGiftId, giftName:actualGiftName, canonicalGiftId, rawInput:giftName||giftId||canonicalGiftId, playerId, userId, username, displayName, avatar, quantity, diamondValue:Number(rawPayload.diamondValue||data.diamondCount||data.diamonds||data.coins||giftObj.diamondCount||1), teamId:rawPayload.teamId||data.teamId||null, duration:rawPayload.duration||data.duration, eventId:nativeId||null, repeatEnd, streaking, giftType, timestamp:Date.now(), source };
    eventBus.emit("gift:received",normalized); eventBus.publish("normalized:gift",normalized); return normalized;
  }
}
export const giftEventBridge=new GiftEventBridge();
if (typeof window!=="undefined") { window.__cocoGiftBridge=(giftId,username,quantity,source,eventId)=>giftEventBridge.processExternalGift({giftId,username,quantity,source,eventId}); window.__cocoLiveInput={enable:()=>giftEventBridge.enableLiveInput(),disable:()=>giftEventBridge.disableLiveInput(),status:()=>giftEventBridge.isLiveInputEnabled()}; }
