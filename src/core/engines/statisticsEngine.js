import { eventBus } from "../eventBus";

class StatisticsEngine {
  constructor(){
    this.stats={session:{totalParticipants:0,eventsProcessed:0,totalGifts:0,generatedPoints:0,totalMessages:0,totalLikes:0,mostActiveUser:null},players:new Map()};
    this.initListeners();
  }
  upsertPlayer(player){
    if(!player)return;
    const id=player.userId||player.id||player.playerId||player.tiktokId||player.username;
    if(!id)return;
    const previous=this.stats.players.get(String(id))||{};
    this.stats.players.set(String(id),{...previous,...player});
    this.recalculateSessionStats();
  }
  initListeners(){
    eventBus.subscribe("player:created",p=>this.upsertPlayer(p));
    eventBus.subscribe("player:updated",p=>this.upsertPlayer(p));
    eventBus.subscribe("PLAYER_CREATED",p=>this.upsertPlayer(p?.player||p));
    eventBus.subscribe("PLAYER_UPDATED",p=>this.upsertPlayer(p?.player||p));
    eventBus.subscribe("reward:processed",reward=>{this.stats.session.totalGifts+=1;this.stats.session.eventsProcessed+=1;this.recalculateSessionStats();});
    eventBus.subscribe("gift:received",()=>{this.stats.session.totalGifts+=1;this.stats.session.eventsProcessed+=1;this.recalculateSessionStats();});
    eventBus.subscribe("chat",payload=>{this.stats.session.eventsProcessed+=1;this.recalculateSessionStats();});
    eventBus.subscribe("like",payload=>{this.stats.session.totalLikes+=Number(payload?.count||payload?.likeCount||1)||1;this.stats.session.eventsProcessed+=1;this.recalculateSessionStats();});
    eventBus.subscribe("LIKE",payload=>{this.stats.session.totalLikes+=Number(payload?.count||payload?.likeCount||1)||1;this.stats.session.eventsProcessed+=1;this.recalculateSessionStats();});
    eventBus.subscribe("session:updated",session=>{
      if(!session)return;
      this.stats.session.eventsProcessed=Number(session.eventsProcessed)||this.stats.session.eventsProcessed;
      this.stats.session.totalMessages=Number(session.totalMessages)||0;
      this.stats.session.totalLikes=Number(session.totalLikes)||this.stats.session.totalLikes;
      this.stats.session.generatedPoints=Number(session.accumulatedPoints)||0;
      this.stats.session.totalGifts=Math.max(this.stats.session.totalGifts,Number(session.giftsReceived)||0);
      if(session.participants)Object.values(session.participants).forEach(p=>this.upsertPlayer(p));
      this.recalculateSessionStats();
    });
  }
  recalculateSessionStats(){
    const playersArr=Array.from(this.stats.players.values());
    this.stats.session.totalParticipants=playersArr.length;
    let messages=0,likes=0,gifts=0,points=0,mostActive=null,maxActivity=-1;
    playersArr.forEach(p=>{
      messages+=Number(p.messages)||0;
      likes+=Number(p.likes)||0;
      gifts+=Number(p.gifts)||0;
      points+=Number(p.points)||0;
      const activity=(Number(p.messages)||0)+(Number(p.gifts)||0)*5+(Number(p.likes)||0)*0.1;
      if(activity>maxActivity){maxActivity=activity;mostActive=p;}
    });
    this.stats.session.totalMessages=Math.max(this.stats.session.totalMessages,messages);
    this.stats.session.totalLikes=Math.max(this.stats.session.totalLikes,likes);
    this.stats.session.totalGifts=Math.max(this.stats.session.totalGifts,gifts);
    this.stats.session.generatedPoints=Math.max(this.stats.session.generatedPoints,points);
    this.stats.session.mostActiveUser=mostActive?.username||mostActive?.displayName||null;
  }
  getStatistics(){return{session:{...this.stats.session},players:Array.from(this.stats.players.values())};}
}
export const statisticsEngine=new StatisticsEngine();
