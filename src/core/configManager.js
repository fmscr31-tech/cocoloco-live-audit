import { eventBus } from "./eventBus";
import { GIFT_CONFIG } from "../config/gifts";
import { GIFT_RULES_BY_MODE } from "../data/giftRules";
import { ABILITY_REGISTRY } from "../config/abilityRegistry";
import { GIFT_ABILITY_MAP } from "../config/giftAbilityMap";
const CONFIG_STORAGE_KEY="cocoloco_system_config";
const ABILITY_SOUND_MIGRATION_VERSION=5;
const DEFAULT_GIFT_SOUNDS=[];
const DEFAULT_FREEZE_CONFIG={duration:300,scope:"TEAM",activationGift:"Twinkling Star",activationGiftId:"twinkling_star",sound:"/Sounds/5-4-3-2-1-are-you-ready.mp3",rescueCount:2};
class ConfigManager{
 constructor(){const stored=this.loadConfig();this.config=stored||this.createDefaultConfig();this.migrateConfiguration();if(typeof window!=="undefined")window.addEventListener("storage",event=>{if(event.key!==CONFIG_STORAGE_KEY||!event.newValue)return;try{this.config=JSON.parse(event.newValue);}catch(e){}});}
 createDefaultConfig(){return{gifts:GIFT_CONFIG,giftRules:GIFT_RULES_BY_MODE,abilities:ABILITY_REGISTRY,abilityGiftMap:GIFT_ABILITY_MAP,giftSounds:DEFAULT_GIFT_SOUNDS,battleEffects:{freeze:DEFAULT_FREEZE_CONFIG},teams:{maxTeams:4,defaultIcon:"🌴"},game:{defaultTimerMinutes:20,autoStartBattles:false},session:{autoSaveIntervalMs:5000}};}
 loadConfig(){try{const data=localStorage.getItem(CONFIG_STORAGE_KEY);return data?JSON.parse(data):null;}catch(e){return null;}}
 saveConfig(){try{localStorage.setItem(CONFIG_STORAGE_KEY,JSON.stringify(this.config));}catch(e){console.warn("[ConfigManager] Failed to persist configuration:",e);}}
 migrateConfiguration(){let changed=false;
  if(!this.config.abilities||typeof this.config.abilities!=="object"){this.config.abilities={...ABILITY_REGISTRY};changed=true;}else for(const[abilityId,ability]of Object.entries(ABILITY_REGISTRY))if(!this.config.abilities[abilityId]){this.config.abilities[abilityId]={...ability};changed=true;}
  if(!Array.isArray(this.config.abilityGiftMap)){this.config.abilityGiftMap=GIFT_ABILITY_MAP.map(item=>({...item,aliases:[...(item.aliases||[])]}));changed=true;}else for(const mapping of GIFT_ABILITY_MAP){const exists=this.config.abilityGiftMap.some(existing=>String(existing?.giftId||"").trim().toLowerCase()===String(mapping.giftId).trim().toLowerCase()||String(existing?.abilityId||"").trim().toLowerCase()===String(mapping.abilityId).trim().toLowerCase());if(!exists){this.config.abilityGiftMap.push({...mapping,aliases:[...(mapping.aliases||[])]});changed=true;}}
  // Gift Sound Overrides are intentionally empty until the operator creates one manually.
  // One-time migration removes the historical/fake override list but preserves all future manual entries.
  if((this.config.giftSoundOverridesMigrationVersion||0)<5){this.config.giftSounds=[];this.config.giftSoundOverridesMigrationVersion=5;changed=true;}
  else if(!Array.isArray(this.config.giftSounds)){this.config.giftSounds=[];changed=true;}
  if(!this.config.battleEffects||typeof this.config.battleEffects!=="object"){this.config.battleEffects={};changed=true;}
  if(!this.config.battleEffects.freeze||typeof this.config.battleEffects.freeze!=="object"){this.config.battleEffects.freeze={...DEFAULT_FREEZE_CONFIG};changed=true;}else{const freeze=this.config.battleEffects.freeze;if(!freeze.activationGift||freeze.activationGift==="STAR"){freeze.activationGift=DEFAULT_FREEZE_CONFIG.activationGift;changed=true;}if(!freeze.activationGiftId||freeze.activationGiftId==="star"){freeze.activationGiftId=DEFAULT_FREEZE_CONFIG.activationGiftId;changed=true;}if(freeze.sound===undefined){freeze.sound=DEFAULT_FREEZE_CONFIG.sound;changed=true;}if(freeze.duration===undefined||freeze.duration===30||freeze.duration<5){freeze.duration=DEFAULT_FREEZE_CONFIG.duration;changed=true;}if(!freeze.scope){freeze.scope=DEFAULT_FREEZE_CONFIG.scope;changed=true;}if(freeze.rescueCount===undefined){freeze.rescueCount=DEFAULT_FREEZE_CONFIG.rescueCount;changed=true;}}
  if((this.config.abilitySoundMigrationVersion||0)<ABILITY_SOUND_MIGRATION_VERSION){this.config.abilitySoundMigrationVersion=ABILITY_SOUND_MIGRATION_VERSION;changed=true;}
  if(changed)this.persist();
 }
 get(path){if(!path)return this.config;const parts=path.split(".");let current=this.config;for(const part of parts){if(current===undefined||current===null)return undefined;current=current[part];}return current;}
 set(path,value){if(!path)return;const latest=this.loadConfig();if(latest&&typeof latest==="object")this.config=latest;const parts=path.split(".");let current=this.config;for(let i=0;i<parts.length-1;i++){const part=parts[i];if(!current[part]||typeof current[part]!=="object")current[part]={};current=current[part];}current[parts[parts.length-1]]=value;this.persist();}
 persist(){this.saveConfig();}
}
export const configManager=new ConfigManager();
