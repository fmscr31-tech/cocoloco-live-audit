/**
 * Ability Registry v1
 * Centralized configuration defining game abilities independently from gifts.
 */
export const ABILITY_REGISTRY = {
  silent_challenge: {
    abilityId: "silent_challenge",
    display: {
      name: "El Mudo",
      icon: "🔇",
      color: "cyan",
      animation: "donutPulse"
    },
    gameAction: {
      type: "CHALLENGE",
      value: "MUTE_WORD"
    },
    scoreAction: {
      type: "ADD_POINTS",
      value: 1
    },
    sound: "/mudo.mp3",
    enabled: true,
    duration: 2500
  },
  creative_challenge: {
    abilityId: "creative_challenge",
    display: {
      name: "Reto Creativo",
      icon: "🤠",
      color: "orange",
      animation: "cowboyPulse"
    },
    gameAction: {
      type: "CHALLENGE",
      value: "ACT_OR_DRAW"
    },
    scoreAction: {
      type: "ADD_POINTS",
      value: 1
    },
    sound: "/Sounds/Sombrero Vaquero.mp3",
    enabled: true,
    duration: 2500
  },
  ultimate_galaxy: {
    abilityId: "ultimate_galaxy",
    display: {
      name: "Galaxy",
      icon: "🌌",
      color: "blue_gold",
      animation: "galaxyUltimateCharge"
    },
    gameAction: {
      type: "SPECIAL_EVENT",
      value: "GALAXY_ULTIMATE"
    },
    scoreAction: {
      type: "ADD_ROUND",
      value: 1
    },
    sound: "/Sounds/Kamehameha.mp3",
    enabled: true,
    duration: 6500
  },
  epic_impact: {
    abilityId: "epic_impact",
    display: {
      name: "REINICIA OPONENTES",
      icon: "💥",
      color: "red",
      animation: "epicImpactSmooth"
    },
    gameAction: {
      type: "SPECIAL_EVENT",
      value: "BULLET_STORM"
    },
    scoreAction: {
      type: "RESET_SCORE",
      value: 0
    },
    sound: "/Sounds/Reinicio.mp3",
    enabled: true,
    duration: 4000
  },
  susto_coco: {
    abilityId: "susto_coco",
    display: {
      name: "Susto a Coco",
      icon: "😱",
      color: "purple",
      animation: "scareActive"
    },
    gameAction: {
      type: "VISUAL_EFFECT",
      value: "SCARE"
    },
    scoreAction: {
      type: "NONE",
      value: 0
    },
    sound: null,
    enabled: true,
    duration: 3000
  }
};
