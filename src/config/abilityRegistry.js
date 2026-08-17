/**
 * Ability Registry v6
 * Every gameplay gift has a concrete ability definition with sound and duration.
 * Unknown TikTok gifts receive a neutral visual/audio reaction instead of failing silently.
 */
export const ABILITY_REGISTRY = {
  silent_challenge: { abilityId: "silent_challenge", display: { name: "El Mudo", icon: "🔇", color: "cyan", animation: "donutPulse" }, gameAction: { type: "CHALLENGE", value: "MUTE_WORD" }, scoreAction: { type: "ADD_POINTS", value: 1 }, sound: "/Sounds/mudo.mp3", enabled: true, duration: 2500 },
  creative_challenge: { abilityId: "creative_challenge", display: { name: "Reto Creativo", icon: "🤠", color: "orange", animation: "cowboyPulse" }, gameAction: { type: "CHALLENGE", value: "ACT_OR_DRAW" }, scoreAction: { type: "ADD_POINTS", value: 5 }, sound: "/Sounds/Sombrero Vaquero.mp3", enabled: true, duration: 2500 },
  freeze: { abilityId: "freeze", display: { name: "Congelados", icon: "❄️", color: "ice", animation: "snowfall" }, gameAction: { type: "SPECIAL_EVENT", value: "FREEZE_TEAM" }, scoreAction: { type: "NONE", value: 0 }, sound: "/Sounds/Castigados.mp3", enabled: true, duration: 300000 },
  ultimate_galaxy: { abilityId: "ultimate_galaxy", display: { name: "Galaxy", icon: "🌌", color: "blue_gold", animation: "galaxyUltimateCharge" }, gameAction: { type: "SPECIAL_EVENT", value: "GALAXY_ULTIMATE" }, scoreAction: { type: "ADD_ROUND", value: 1 }, sound: "/Sounds/Kamehameha.mp3", enabled: true, duration: 6500 },
  epic_impact: { abilityId: "epic_impact", display: { name: "REINICIA OPONENTES", icon: "💥", color: "red", animation: "epicImpactSmooth" }, gameAction: { type: "SPECIAL_EVENT", value: "BULLET_STORM" }, scoreAction: { type: "RESET_SCORE", value: 0 }, sound: "/Sounds/Reinicio.mp3", enabled: true, duration: 4000 },
  susto_coco: { abilityId: "susto_coco", display: { name: "Susto a Coco", icon: "😱", color: "purple", animation: "scareActive" }, gameAction: { type: "VISUAL_EFFECT", value: "SCARE" }, scoreAction: { type: "NONE", value: 0 }, sound: "/Sounds/Grito feo.mp3", enabled: true, duration: 3000 },
  clue_hint: { abilityId: "clue_hint", display: { name: "Pista", icon: "🍦", color: "cream", animation: "cluePop" }, gameAction: { type: "VISUAL_EFFECT", value: "CLUE" }, scoreAction: { type: "NONE", value: 0 }, sound: "/Sounds/Ahh cute.mp3", enabled: true, duration: 2200 },
  generic_gift: { abilityId: "generic_gift", display: { name: "Regalo", icon: "🎁", color: "gold", animation: "giftPop" }, gameAction: { type: "VISUAL_EFFECT", value: "GENERIC_GIFT" }, scoreAction: { type: "NONE", value: 0 }, sound: "/Sounds/Ahh cute.mp3", enabled: true, duration: 1600 },
  cocazo: { abilityId: "cocazo", display: { name: "Cocazo", icon: "🥥", color: "tropical", animation: "cocazoSlam" }, gameAction: { type: "VISUAL_EFFECT", value: "COCAZO" }, scoreAction: { type: "NONE", value: 0 }, sound: "/Sounds/coconut-sfx.mp3", enabled: true, duration: 1800 }
};
