import { eventBus } from "./eventBus";
import "./abilityActionDispatcher";

class AbilityEventQueue {
  constructor() { this.queue=[]; this.currentPlaying=null; this.timerId=null; }

  enqueue(abilityPayload) {
    if (!abilityPayload) return;
    const item = { ...abilityPayload, priority: abilityPayload.priority !== undefined ? abilityPayload.priority : 0, timestamp: abilityPayload.timestamp || Date.now(), executionId: abilityPayload.executionId || `ability_${Date.now()}_${Math.random().toString(36).slice(2,10)}`, status:"queued" };
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
